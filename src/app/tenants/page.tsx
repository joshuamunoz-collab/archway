import { AppShell } from '@/components/shared/app-shell'
import { TenantTable } from '@/components/tenant/tenant-table'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Tenants — Archway' }

export default async function TenantsPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      leases: {
        where: { status: 'active' },
        take: 1,
        orderBy: { startDate: 'desc' },
        include: {
          property: {
            select: { id: true, addressLine1: true, addressLine2: true },
          },
        },
      },
    },
  })

  const serialized = tenants.map(t => ({
    id: t.id,
    firstName: t.firstName,
    lastName: t.lastName,
    phone: t.phone,
    email: t.email,
    voucherNumber: t.voucherNumber,
    phaCaseworker: t.phaCaseworker,
    phaPhone: t.phaPhone,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    activeLease: t.leases[0]
      ? {
          id: t.leases[0].id,
          startDate: t.leases[0].startDate.toISOString(),
          endDate: t.leases[0].endDate?.toISOString() ?? null,
          contractRent: Number(t.leases[0].contractRent),
          property: t.leases[0].property,
        }
      : null,
  }))

  return (
    <AppShell>
      <TenantTable tenants={serialized} />
    </AppShell>
  )
}
