export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/shared/app-shell'
import { BillsViewToggle } from '@/components/bills/bills-view-toggle'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'PM Bills — Archway' }

export default async function BillsPage() {
  // Step 1: fetch bills + properties (original working queries)
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

  // Step 2: fetch active leases separately (sequential, not in Promise.all)
  let pipelineCards: Array<{
    id: string; leaseId: string; billId: string | null; propertyId: string
    propertyAddress: string; entityId: string; entityName: string
    tenantName: string; monthlyRent: number; status: string; paidDate: string | null
  }> = []

  try {
    const activeLeases = await prisma.lease.findMany({
      where: { status: 'active' },
      orderBy: { startDate: 'desc' },
      include: {
        tenant: { select: { firstName: true, lastName: true } },
        property: {
          select: {
            id: true, addressLine1: true, addressLine2: true,
            entity: { select: { id: true, name: true } },
            pmBills: {
              orderBy: { billDate: 'desc' },
              take: 1,
              select: { id: true, status: true, totalAmount: true, paidDate: true },
            },
          },
        },
      },
    })

    pipelineCards = activeLeases.map(lease => {
      const bill = lease.property.pmBills[0]
      return {
        id: String(`lease::${lease.id}`),
        leaseId: String(lease.id),
        billId: bill ? String(bill.id) : null,
        propertyId: String(lease.property.id),
        propertyAddress: String(lease.property.addressLine1),
        entityId: String(lease.property.entity.id),
        entityName: String(lease.property.entity.name),
        tenantName: String(`${lease.tenant.firstName} ${lease.tenant.lastName}`),
        monthlyRent: Number(lease.contractRent),
        status: bill ? String(bill.status) : 'received',
        paidDate: bill?.paidDate ? bill.paidDate.toISOString() : null,
      }
    })
  } catch (err) {
    console.error('[BillsPage] Failed to load pipeline data:', err)
  }

  // Serialize bills — all plain JS values, no raw Prisma objects
  const tableBills = bills.map(b => ({
    id: String(b.id),
    propertyId: String(b.propertyId),
    property: {
      id: String(b.property.id),
      addressLine1: String(b.property.addressLine1),
      addressLine2: b.property.addressLine2 ? String(b.property.addressLine2) : null,
      entity: { id: String(b.property.entity.id), name: String(b.property.entity.name) },
    },
    vendorName: b.vendorName ? String(b.vendorName) : null,
    invoiceNumber: b.invoiceNumber ? String(b.invoiceNumber) : null,
    billDate: b.billDate.toISOString(),
    dueDate: b.dueDate ? b.dueDate.toISOString() : null,
    totalAmount: Number(b.totalAmount),
    status: String(b.status),
    approvedBy: b.approvedBy ? String(b.approvedBy) : null,
    approvedAt: b.approvedAt ? b.approvedAt.toISOString() : null,
    paidDate: b.paidDate ? b.paidDate.toISOString() : null,
    paymentMethod: b.paymentMethod ? String(b.paymentMethod) : null,
    paymentReference: b.paymentReference ? String(b.paymentReference) : null,
    invoiceUrl: b.invoiceUrl ? String(b.invoiceUrl) : null,
    notes: b.notes ? String(b.notes) : null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    approver: b.approver ? { fullName: String(b.approver.fullName) } : null,
    lineItems: b.lineItems.map(li => ({
      id: String(li.id),
      description: String(li.description),
      category: li.category ? String(li.category) : null,
      subcategory: li.subcategory ? String(li.subcategory) : null,
      amount: Number(li.amount),
      sortOrder: Number(li.sortOrder),
    })),
  }))

  return (
    <AppShell>
      <BillsViewToggle
        tableBills={tableBills}
        pipelineCards={pipelineCards}
        properties={properties}
      />
    </AppShell>
  )
}
