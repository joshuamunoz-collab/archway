export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/shared/app-shell'
import { BillsViewToggle } from '@/components/bills/bills-view-toggle'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'PM Bills — Archway' }

export default async function BillsPage() {
  // Properties for the "Add Bill" form
  const properties = await prisma.property.findMany({
    orderBy: { addressLine1: 'asc' },
    select: { id: true, addressLine1: true, addressLine2: true },
  })

  // Step 2: fetch active leases separately (sequential, not in Promise.all)
  let pipelineCards: Array<{
    id: string; leaseId: string; billId: string | null; propertyId: string
    propertyAddress: string; entityId: string; entityName: string
    tenantName: string; monthlyRent: number; status: string; paidDate: string | null
    date: string; vendorName: string | null; invoiceNumber: string | null
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
              select: {
                id: true, status: true, totalAmount: true, paidDate: true,
                billDate: true, vendorName: true, invoiceNumber: true,
              },
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
        date: bill?.billDate ? bill.billDate.toISOString() : lease.startDate.toISOString(),
        vendorName: bill?.vendorName ? String(bill.vendorName) : null,
        invoiceNumber: bill?.invoiceNumber ? String(bill.invoiceNumber) : null,
      }
    })
  } catch (err) {
    console.error('[BillsPage] Failed to load pipeline data:', err)
  }

  return (
    <AppShell>
      <BillsViewToggle
        pipelineCards={pipelineCards}
        properties={properties}
      />
    </AppShell>
  )
}
