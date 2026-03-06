export const metadata = { title: 'Financials — Archway' }

import { AppShell } from '@/components/shared/app-shell'
import { FinancialsDashboard } from '@/components/financials/financials-dashboard'

export default async function FinancialsPage() {
  return (
    <AppShell>
      <div className="px-8 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
        </div>
        <FinancialsDashboard />
      </div>
    </AppShell>
  )
}
