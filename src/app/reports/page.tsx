export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reports — Archway' }

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
      <div className="px-8 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Exports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and download portfolio reports</p>
        </div>
        <ReportBuilder entities={entities} />
      </div>
    </AppShell>
  )
}
