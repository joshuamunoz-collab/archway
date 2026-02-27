import { AppShell } from '@/components/shared/app-shell'
import { EntityManager } from '@/components/dashboard/entity-manager'
import { prisma } from '@/lib/prisma'

export default async function EntitiesPage() {
  const entities = await prisma.entity.findMany({
    include: { bankAccounts: { orderBy: { accountType: 'asc' } } },
    orderBy: { name: 'asc' },
  })

  // Prisma Decimal → number for client component
  const serialized = entities.map(e => ({
    ...e,
    pmFeePct: Number(e.pmFeePct),
    bankAccounts: e.bankAccounts,
  }))

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <EntityManager initial={serialized} />
      </div>
    </AppShell>
  )
}
