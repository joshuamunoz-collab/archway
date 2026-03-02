import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

// POST /api/bills/bulk
// Body: { action: 'approve' | 'pay', billIds: string[], paidDate?, paymentMethod?, bankAccountId? }
export async function POST(request: Request) {
  // Only admins can bulk approve/pay bills
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { action, billIds, paidDate, paymentMethod, paymentReference, bankAccountId } = await request.json()

  if (!action || !Array.isArray(billIds) || billIds.length === 0) {
    return NextResponse.json({ error: 'action and billIds are required' }, { status: 400 })
  }

  if (billIds.length > 100) {
    return NextResponse.json({ error: 'Cannot process more than 100 bills at once' }, { status: 400 })
  }

  let updated = 0

  if (action === 'approve') {
    await prisma.pmBill.updateMany({
      where: { id: { in: billIds }, status: { in: ['received', 'under_review'] } },
      data: { status: 'approved', approvedBy: auth.user.id, approvedAt: new Date() },
    })
    updated = billIds.length

    for (const billId of billIds) {
      const bill = await prisma.pmBill.findUnique({ where: { id: billId } })
      if (bill) {
        await prisma.activityLog.create({
          data: {
            entityType: 'property',
            entityId: bill.propertyId,
            action: 'bill_approved',
            details: { billId, totalAmount: Number(bill.totalAmount) },
            userId: auth.user.id,
          },
        })
      }
    }
  } else if (action === 'pay') {
    const paidDateValue = paidDate ? new Date(paidDate) : new Date()

    for (const billId of billIds) {
      const bill = await prisma.pmBill.findUnique({
        where: { id: billId },
        include: { lineItems: true },
      })
      if (!bill || bill.status === 'paid') continue

      await prisma.pmBill.update({
        where: { id: billId },
        data: {
          status: 'paid',
          paidDate: paidDateValue,
          paymentMethod: paymentMethod || null,
          paymentReference: paymentReference || null,
          bankAccountId: bankAccountId || null,
        },
      })

      // Auto-create expenses
      const existingExpenses = await prisma.expense.count({ where: { billId } })
      if (existingExpenses === 0) {
        await prisma.expense.createMany({
          data: bill.lineItems.map(li => ({
            propertyId: bill.propertyId,
            date: paidDateValue,
            amount: li.amount,
            category: li.category ?? 'other',
            subcategory: li.subcategory ?? null,
            vendor: bill.vendorName ?? null,
            description: li.description,
            source: 'pm_bill',
            billId,
          })),
        })
      }

      await prisma.activityLog.create({
        data: {
          entityType: 'property',
          entityId: bill.propertyId,
          action: 'bill_paid',
          details: { billId, totalAmount: Number(bill.totalAmount) },
          userId: auth.user.id,
        },
      })
      updated++
    }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ updated })
}
