import { AppShell } from '@/components/shared/app-shell'
import { PropertyTable, type PropertyRow } from '@/components/property/property-table'
import { prisma } from '@/lib/prisma'

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({
    include: { entity: { select: { name: true } } },
    orderBy: { addressLine1: 'asc' },
  })

  const entities = await prisma.entity.findMany({
    select: { name: true },
    orderBy: { name: 'asc' },
  })

  const rows: PropertyRow[] = properties.map(p => ({
    id: p.id,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    status: p.status,
    entityName: p.entity.name,
    isSection8: p.isSection8,
    propertyType: p.propertyType,
    beds: p.beds,
    baths: p.baths !== null ? Number(p.baths) : null,
    neighborhood: p.neighborhood,
    ward: p.ward,
    vacantSince: p.vacantSince ? p.vacantSince.toISOString() : null,
  }))

  const entityNames = entities.map(e => e.name)

  return (
    <AppShell>
      <div className="p-8 max-w-7xl">
        <PropertyTable data={rows} entityNames={entityNames} />
      </div>
    </AppShell>
  )
}
