import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

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
      userId: auth.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
