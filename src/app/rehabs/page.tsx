import { AppShell } from '@/components/shared/app-shell'
import { prisma } from '@/lib/prisma'
import { RehabList } from '@/components/rehabs/rehab-list'

export default async function RehabsPage() {
  const [rehabs, properties] = await Promise.all([
    prisma.rehabProject.findMany({
      include: {
        property: { select: { id: true, addressLine1: true, entity: { select: { name: true } } } },
        milestones: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.property.findMany({
      select: { id: true, addressLine1: true },
      orderBy: { addressLine1: 'asc' },
    }),
  ])

  const serialized = rehabs.map(r => ({
    id: r.id,
    propertyId: r.propertyId,
    property: { id: r.property.id, addressLine1: r.property.addressLine1, entityName: r.property.entity.name },
    scope: r.scope,
    startDate: r.startDate?.toISOString().split('T')[0] ?? null,
    targetEndDate: r.targetEndDate?.toISOString().split('T')[0] ?? null,
    actualEndDate: r.actualEndDate?.toISOString().split('T')[0] ?? null,
    originalEstimate: r.originalEstimate !== null ? Number(r.originalEstimate) : null,
    currentEstimate: r.currentEstimate !== null ? Number(r.currentEstimate) : null,
    actualCost: Number(r.actualCost),
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    milestones: r.milestones.map(m => ({
      id: m.id,
      name: m.name,
      sortOrder: m.sortOrder,
      targetDate: m.targetDate?.toISOString().split('T')[0] ?? null,
      actualDate: m.actualDate?.toISOString().split('T')[0] ?? null,
      status: m.status,
      notes: m.notes,
    })),
  }))

  const propertyOptions = properties.map(p => ({ id: p.id, addressLine1: p.addressLine1 }))

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Rehab Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track renovation budgets, timelines, and milestones</p>
        </div>
        <RehabList rehabs={serialized} properties={propertyOptions} />
      </div>
    </AppShell>
  )
}
