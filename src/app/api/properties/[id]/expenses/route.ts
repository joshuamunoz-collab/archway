import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

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
      userId: auth.user.id,
    },
  })

  return NextResponse.json({
    ...expense,
    amount: Number(expense.amount),
  }, { status: 201 })
}
