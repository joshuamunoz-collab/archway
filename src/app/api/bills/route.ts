import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // received | under_review | approved | paid | disputed | all

  const where = status && status !== 'all' ? { status } : {}

  const bills = await prisma.pmBill.findMany({
    where,
    orderBy: { billDate: 'desc' },
    include: {
      property: {
        select: { id: true, addressLine1: true, addressLine2: true, entity: { select: { id: true, name: true } } },
      },
      lineItems: { orderBy: { sortOrder: 'asc' } },
      approver: { select: { fullName: true } },
    },
  })

  // Serialize Decimals
  const serialized = bills.map(b => ({
    ...b,
    totalAmount: Number(b.totalAmount),
    billDate: b.billDate.toISOString(),
    dueDate: b.dueDate?.toISOString() ?? null,
    approvedAt: b.approvedAt?.toISOString() ?? null,
    paidDate: b.paidDate?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    lineItems: b.lineItems.map(li => ({ ...li, amount: Number(li.amount) })),
  }))

  return NextResponse.json(serialized)
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { propertyId, vendorName, invoiceNumber, billDate, dueDate, lineItems, invoiceUrl, notes } = body

  if (!propertyId || !billDate || !lineItems?.length) {
    return NextResponse.json({ error: 'propertyId, billDate, and at least one line item are required' }, { status: 400 })
  }

  const totalAmount = lineItems.reduce((sum: number, li: { amount: number }) => sum + Number(li.amount), 0)

  const bill = await prisma.pmBill.create({
    data: {
      propertyId,
      vendorName: vendorName || null,
      invoiceNumber: invoiceNumber || null,
      billDate: new Date(billDate),
      dueDate: dueDate ? new Date(dueDate) : null,
      totalAmount,
      status: 'received',
      invoiceUrl: invoiceUrl || null,
      notes: notes || null,
      lineItems: {
        create: lineItems.map((li: { description: string; category?: string; subcategory?: string; amount: number }, i: number) => ({
          description: li.description,
          category: li.category || null,
          subcategory: li.subcategory || null,
          amount: li.amount,
          sortOrder: i,
        })),
      },
    },
    include: { lineItems: true, property: { select: { addressLine1: true } } },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: propertyId,
      action: 'bill_created',
      details: { totalAmount, vendorName: vendorName || null, invoiceNumber: invoiceNumber || null },
      userId: auth.user.id,
    },
  })

  return NextResponse.json({
    ...bill,
    totalAmount: Number(bill.totalAmount),
    lineItems: bill.lineItems.map(li => ({ ...li, amount: Number(li.amount) })),
  }, { status: 201 })
}
