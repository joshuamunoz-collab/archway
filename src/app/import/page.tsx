import { AppShell } from '@/components/shared/app-shell'
import { PropertyImporter } from '@/components/dashboard/property-importer'
import { prisma } from '@/lib/prisma'

export default async function ImportPage() {
  const entities = await prisma.entity.findMany({
    select: { name: true },
    orderBy: { name: 'asc' },
  })

  const entityNames = entities.map(e => e.name)

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <PropertyImporter entityNames={entityNames} />
      </div>
    </AppShell>
  )
}
