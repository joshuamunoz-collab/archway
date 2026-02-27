import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: propertyId } = await params
  const body = await request.json()

  const { date, amount, category, subcategory, vendor, description, bankAccountId, notes } = body

  if (!date || amount == null || !category) {
    return NextResponse.json({ error: 'date, amount, and category are required' }, { status: 400 })
  }

  const expense = await prisma.expense.create({
    data: {
      propertyId,
      date: new Date(date),
      amount: parseFloat(String(amount)),
      category,
      subcategory: subcategory || null,
      vendor: vendor || null,
      description: description || null,
      bankAccountId: bankAccountId || null,
      notes: notes || null,
      source: 'manual',
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: propertyId,
      action: 'expense_added',
      details: { category, amount: Number(amount), vendor: vendor || null },
      userId: user.id,
    },
  })

  return NextResponse.json(expense, { status: 201 })
}
