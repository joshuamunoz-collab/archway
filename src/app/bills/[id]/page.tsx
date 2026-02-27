export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/shared/app-shell'
import { BillDetail } from '@/components/bills/bill-detail'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
        include: { user: { select: { id: true, fullName: true } } },
      },
      approver: { select: { fullName: true } },
    },
  })

  if (!bill) notFound()

  const serialized = {
    id: bill.id,
    propertyId: bill.propertyId,
    property: {
      ...bill.property,
      entity: { ...bill.property.entity, pmFeePct: Number(bill.property.entity.pmFeePct) },
    },
    vendorName: bill.vendorName,
    invoiceNumber: bill.invoiceNumber,
    billDate: bill.billDate.toISOString(),
    dueDate: bill.dueDate?.toISOString() ?? null,
    totalAmount: Number(bill.totalAmount),
    status: bill.status,
    approvedBy: bill.approvedBy,
    approvedAt: bill.approvedAt?.toISOString() ?? null,
    paidDate: bill.paidDate?.toISOString() ?? null,
    paymentMethod: bill.paymentMethod,
    paymentReference: bill.paymentReference,
    invoiceUrl: bill.invoiceUrl,
    notes: bill.notes,
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
    approver: bill.approver,
    lineItems: bill.lineItems.map(li => ({
      id: li.id,
      description: li.description,
      category: li.category,
      subcategory: li.subcategory,
      amount: Number(li.amount),
      sortOrder: li.sortOrder,
    })),
    messages: bill.messages.map(m => ({
      id: m.id,
      userId: m.userId,
      user: m.user,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    })),
  }

  return (
    <AppShell>
      <BillDetail bill={serialized} />
    </AppShell>
  )
}
