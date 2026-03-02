export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pipeline — Archway' }

import { AppShell } from '@/components/shared/app-shell'
import { prisma } from '@/lib/prisma'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'

export default async function PipelinePage() {
  const [properties, entities] = await Promise.all([
    prisma.property.findMany({
      where: {
        status: { in: ['vacant', 'rehab', 'pending_inspection', 'pending_packet'] },
      },
      select: {
        id: true,
        addressLine1: true,
        addressLine2: true,
        status: true,
        vacantSince: true,
        beds: true,
        baths: true,
        entity: { select: { id: true, name: true } },
      },
      orderBy: { vacantSince: 'asc' },
    }),
    prisma.entity.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  const serialized = properties.map(p => ({
    id: p.id,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    status: p.status,
    vacantSince: p.vacantSince?.toISOString().split('T')[0] ?? null,
    beds: p.beds,
    baths: p.baths !== null ? Number(p.baths) : null,
    entity: p.entity,
  }))

  return (
    <AppShell>
      <div className="px-8 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Re-Leasing Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} in transition
          </p>
        </div>
        <PipelineBoard properties={serialized} entities={entities} />
      </div>
    </AppShell>
  )
}
