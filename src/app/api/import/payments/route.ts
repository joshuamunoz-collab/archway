import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

// POST /api/import/payments
// Body: { rows: Array<{ date, addressLine1, amount, type, status?, referenceNumber?, notes? }> }
// Each row is matched to a property by addressLine1 (case-insensitive, partial match)

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { rows } = await request.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 })
  }

  // Load all properties once
  const properties = await prisma.property.findMany({
    select: { id: true, addressLine1: true },
  })

  // Batch-load all active leases to avoid N+1 queries per row
  const activeLeases = await prisma.lease.findMany({
    where: { status: 'active' },
    select: { id: true, propertyId: true, startDate: true },
    orderBy: { startDate: 'desc' },
  })
  const leaseByProperty = new Map<string, string>()
  for (const lease of activeLeases) {
    if (!leaseByProperty.has(lease.propertyId)) {
      leaseByProperty.set(lease.propertyId, lease.id)
    }
  }

  const results: { row: number; status: 'imported' | 'error'; message?: string }[] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const { date, addressLine1, amount, type, status, referenceNumber, notes } = row

      if (!date || !addressLine1 || amount == null || !type) {
        results.push({ row: i + 1, status: 'error', message: 'Missing required fields (date, addressLine1, amount, type)' })
        continue
      }

      // Match property
      const search = String(addressLine1).trim().toLowerCase()
      const property = properties.find(p =>
        p.addressLine1.toLowerCase().includes(search) ||
        search.includes(p.addressLine1.toLowerCase())
      )
      if (!property) {
        results.push({ row: i + 1, status: 'error', message: `Property not found: "${addressLine1}"` })
        continue
      }

      // Use pre-loaded lease map instead of per-row DB query
      const leaseId = leaseByProperty.get(property.id) ?? null

      await prisma.payment.create({
        data: {
          propertyId: property.id,
          leaseId,
          date: new Date(date),
          amount: parseFloat(String(amount)),
          type: String(type).toLowerCase().trim(),
          status: status ? String(status).toLowerCase().trim() : 'received',
          referenceNumber: referenceNumber ? String(referenceNumber) : null,
          notes: notes ? String(notes) : null,
        },
      })

      results.push({ row: i + 1, status: 'imported' })
      imported++
    } catch (err) {
      results.push({
        row: i + 1,
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  if (imported > 0) {
    await prisma.activityLog.create({
      data: {
        entityType: 'system',
        entityId: '00000000-0000-0000-0000-000000000000',
        action: 'payments_imported',
        details: { imported, total: rows.length },
        userId: auth.user.id,
      },
    })
  }

  return NextResponse.json({ imported, total: rows.length, results })
}
