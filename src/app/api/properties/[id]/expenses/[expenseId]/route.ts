import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: propertyId, expenseId } = await params

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } })
  if (!expense || expense.propertyId !== propertyId) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  // Prevent deleting auto-generated PM fee expenses linked to a bill
  if (expense.source === 'pm_bill' && expense.billId) {
    return NextResponse.json(
      { error: 'Cannot delete an expense auto-generated from a PM bill. Delete the bill instead.' },
      { status: 409 }
    )
  }

  await prisma.expense.delete({ where: { id: expenseId } })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: propertyId,
      action: 'expense_deleted',
      details: { category: expense.category, amount: Number(expense.amount) },
      userId: user.id,
    },
  })

  return NextResponse.json({ success: true })
}
