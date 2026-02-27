import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// POST /api/import/expenses
// Body: { rows: Array<{ date, addressLine1, amount, category, subcategory?, vendor?, description?, notes? }> }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows } = await request.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 })
  }

  const properties = await prisma.property.findMany({
    select: { id: true, addressLine1: true },
  })

  const results: { row: number; status: 'imported' | 'error'; message?: string }[] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const { date, addressLine1, amount, category, subcategory, vendor, description, notes } = row

      if (!date || !addressLine1 || amount == null || !category) {
        results.push({ row: i + 1, status: 'error', message: 'Missing required fields (date, addressLine1, amount, category)' })
        continue
      }

      const search = String(addressLine1).trim().toLowerCase()
      const property = properties.find(p =>
        p.addressLine1.toLowerCase().includes(search) ||
        search.includes(p.addressLine1.toLowerCase())
      )
      if (!property) {
        results.push({ row: i + 1, status: 'error', message: `Property not found: "${addressLine1}"` })
        continue
      }

      await prisma.expense.create({
        data: {
          propertyId: property.id,
          date: new Date(date),
          amount: parseFloat(String(amount)),
          category: String(category).toLowerCase().trim(),
          subcategory: subcategory ? String(subcategory).toLowerCase().trim() : null,
          vendor: vendor ? String(vendor) : null,
          description: description ? String(description) : null,
          notes: notes ? String(notes) : null,
          source: 'manual',
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
        action: 'expenses_imported',
        details: { imported, total: rows.length },
        userId: user.id,
      },
    })
  }

  return NextResponse.json({ imported, total: rows.length, results })
}
