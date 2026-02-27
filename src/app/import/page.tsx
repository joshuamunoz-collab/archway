export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/shared/app-shell'
import { PropertyImporter } from '@/components/dashboard/property-importer'
import { PaymentsImporter } from '@/components/import/payments-importer'
import { ExpensesImporter } from '@/components/import/expenses-importer'
import { prisma } from '@/lib/prisma'

export default async function ImportPage() {
  const entities = await prisma.entity.findMany({
    select: { name: true },
    orderBy: { name: 'asc' },
  })

  const entityNames = entities.map(e => e.name)

  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Import Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload CSV files to bulk-import properties, payments, and expenses</p>
        </div>

        <section>
          <h2 className="text-base font-semibold mb-4 border-b pb-2">Properties</h2>
          <PropertyImporter entityNames={entityNames} />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-4 border-b pb-2">Payments</h2>
          <PaymentsImporter />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-4 border-b pb-2">Expenses</h2>
          <ExpensesImporter />
        </section>
      </div>
    </AppShell>
  )
}
