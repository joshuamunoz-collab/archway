import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const bill = await prisma.pmBill.findUnique({
    where: { id },
    include: {
      property: {
        select: {
          id: true, addressLine1: true, addressLine2: true,
          entity: { select: { id: true, name: true, pmFeePct: true } },
        },
      },
      lineItems: { orderBy: { sortOrder: 'asc' } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { fullName: true } } },
      },
      approver: { select: { fullName: true } },
    },
  })

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

  return NextResponse.json({
    ...bill,
    totalAmount: Number(bill.totalAmount),
    billDate: bill.billDate.toISOString(),
    dueDate: bill.dueDate?.toISOString() ?? null,
    approvedAt: bill.approvedAt?.toISOString() ?? null,
    paidDate: bill.paidDate?.toISOString() ?? null,
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
    lineItems: bill.lineItems.map(li => ({ ...li, amount: Number(li.amount) })),
    messages: bill.messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { status, paidDate, paymentMethod, paymentReference, bankAccountId, notes } = body

  const bill = await prisma.pmBill.findUnique({
    where: { id },
    include: { lineItems: true, property: { include: { entity: true } } },
  })
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status
  if (notes !== undefined) updateData.notes = notes || null

  if (status === 'approved') {
    updateData.approvedBy = user.id
    updateData.approvedAt = new Date()
  }

  if (status === 'paid') {
    updateData.paidDate = paidDate ? new Date(paidDate) : new Date()
    if (paymentMethod) updateData.paymentMethod = paymentMethod
    if (paymentReference) updateData.paymentReference = paymentReference
    if (bankAccountId) updateData.bankAccountId = bankAccountId

    // Auto-create expense records from each line item (if not already done)
    const existingExpenses = await prisma.expense.count({ where: { billId: id } })
    if (existingExpenses === 0) {
      const paidDateValue = paidDate ? new Date(paidDate) : new Date()
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
          billId: id,
        })),
      })
    }
  }

  const updated = await prisma.pmBill.update({ where: { id }, data: updateData })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: bill.propertyId,
      action: `bill_${status ?? 'updated'}`,
      details: { billId: id, totalAmount: Number(bill.totalAmount) },
      userId: user.id,
    },
  })

  return NextResponse.json({ ...updated, totalAmount: Number(updated.totalAmount) })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const bill = await prisma.pmBill.findUnique({ where: { id } })
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

  if (bill.status === 'paid') {
    return NextResponse.json({ error: 'Cannot delete a paid bill' }, { status: 409 })
  }

  // Delete linked expenses first
  await prisma.expense.deleteMany({ where: { billId: id } })
  await prisma.pmBill.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
