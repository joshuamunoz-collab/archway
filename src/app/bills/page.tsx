import { AppShell } from '@/components/shared/app-shell'
import { BillsTable } from '@/components/bills/bills-table'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'PM Bills — Archway' }

export default async function BillsPage() {
  const [bills, properties] = await Promise.all([
    prisma.pmBill.findMany({
      orderBy: { billDate: 'desc' },
      include: {
        property: {
          select: {
            id: true, addressLine1: true, addressLine2: true,
            entity: { select: { id: true, name: true } },
          },
        },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        approver: { select: { fullName: true } },
      },
    }),
    prisma.property.findMany({
      orderBy: { addressLine1: 'asc' },
      select: { id: true, addressLine1: true, addressLine2: true },
    }),
  ])

  const serialized = bills.map(b => ({
    id: b.id,
    propertyId: b.propertyId,
    property: b.property,
    vendorName: b.vendorName,
    invoiceNumber: b.invoiceNumber,
    billDate: b.billDate.toISOString(),
    dueDate: b.dueDate?.toISOString() ?? null,
    totalAmount: Number(b.totalAmount),
    status: b.status,
    approvedBy: b.approvedBy,
    approvedAt: b.approvedAt?.toISOString() ?? null,
    paidDate: b.paidDate?.toISOString() ?? null,
    paymentMethod: b.paymentMethod,
    paymentReference: b.paymentReference,
    invoiceUrl: b.invoiceUrl,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    approver: b.approver,
    lineItems: b.lineItems.map(li => ({
      id: li.id,
      description: li.description,
      category: li.category,
      subcategory: li.subcategory,
      amount: Number(li.amount),
      sortOrder: li.sortOrder,
    })),
  }))

  return (
    <AppShell>
      <BillsTable bills={serialized} properties={properties} />
    </AppShell>
  )
}
