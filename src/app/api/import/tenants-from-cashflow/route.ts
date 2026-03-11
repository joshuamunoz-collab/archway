import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// POST /api/import/tenants-from-cashflow
// Body: { entries: Array<{ tenantName: string, propertyAddress: string, contractRent?: number }> }
// Creates Tenant records (and active Leases) from cashflow spreadsheet data.

function parseName(raw: string): { firstName: string; lastName: string } | null {
  const name = raw.trim()
  if (!name || name === '—' || name.toLowerCase() === 'vacant') return null

  const parts = name.split(/\s+/)
  if (parts.length === 0) return null

  // Cashflow format is typically "LASTNAME FIRSTNAME" or "LASTNAME FIRSTNAME MIDDLE"
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] }

  const lastName = parts[0]
  const firstName = parts.slice(1).join(' ')
  return { firstName, lastName }
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { entries } = await request.json()
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: 'entries array is required' }, { status: 400 })
  }

  // Load all properties for address matching
  const properties = await prisma.property.findMany({
    select: { id: true, addressLine1: true },
  })

  // Load existing tenants for dedup
  const existingTenants = await prisma.tenant.findMany({
    select: { id: true, firstName: true, lastName: true },
  })
  const tenantKey = (fn: string, ln: string) => `${fn.toLowerCase()}|${ln.toLowerCase()}`
  const tenantMap = new Map(existingTenants.map(t => [tenantKey(t.firstName, t.lastName), t.id]))

  // Load existing active leases to avoid duplicates
  const activeLeases = await prisma.lease.findMany({
    where: { status: 'active' },
    select: { propertyId: true, tenantId: true },
  })
  const leaseSet = new Set(activeLeases.map(l => `${l.propertyId}|${l.tenantId}`))

  let tenantsCreated = 0
  let leasesCreated = 0
  let skipped = 0

  // Deduplicate entries by tenant name + address
  const seen = new Set<string>()

  for (const entry of entries) {
    const { tenantName, propertyAddress, contractRent } = entry
    if (!tenantName || !propertyAddress) { skipped++; continue }

    const parsed = parseName(tenantName)
    if (!parsed) { skipped++; continue }

    const firstName = titleCase(parsed.firstName)
    const lastName = titleCase(parsed.lastName)
    const key = `${tenantKey(firstName, lastName)}|${propertyAddress.toLowerCase().trim()}`
    if (seen.has(key)) continue
    seen.add(key)

    // Match property by address
    const addrSearch = propertyAddress.trim().toLowerCase()
    const property = properties.find(p =>
      p.addressLine1.toLowerCase().includes(addrSearch) ||
      addrSearch.includes(p.addressLine1.toLowerCase())
    )
    if (!property) { skipped++; continue }

    // Find or create tenant
    const tk = tenantKey(firstName, lastName)
    let tenantId = tenantMap.get(tk)
    if (!tenantId) {
      const tenant = await prisma.tenant.create({
        data: { firstName, lastName },
      })
      tenantId = tenant.id
      tenantMap.set(tk, tenantId)
      tenantsCreated++
    }

    // Create active lease if none exists for this property+tenant
    const lk = `${property.id}|${tenantId}`
    if (!leaseSet.has(lk)) {
      await prisma.lease.create({
        data: {
          propertyId: property.id,
          tenantId,
          startDate: new Date(),
          contractRent: contractRent ?? 0,
          status: 'active',
        },
      })
      leaseSet.add(lk)
      leasesCreated++
    }
  }

  if (tenantsCreated > 0) {
    await prisma.activityLog.create({
      data: {
        entityType: 'system',
        entityId: '00000000-0000-0000-0000-000000000000',
        action: 'tenants_synced_from_cashflow',
        details: { tenantsCreated, leasesCreated, skipped },
        userId: auth.user.id,
      },
    })
  }

  return NextResponse.json({ tenantsCreated, leasesCreated, skipped })
}
