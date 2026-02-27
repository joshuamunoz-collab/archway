export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/shared/app-shell'
import { prisma } from '@/lib/prisma'
import { ReportBuilder } from '@/components/reports/report-builder'

export default async function ReportsPage() {
  const entities = await prisma.entity.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports & Exports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate and download portfolio reports</p>
        </div>
        <ReportBuilder entities={entities} />
      </div>
    </AppShell>
  )
}
