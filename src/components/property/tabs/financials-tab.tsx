import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'
import type { PropertyDetailData } from '@/types/property'
import { cn } from '@/lib/utils'

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  hap: 'HAP',
  copay: 'Copay',
  other_income: 'Other',
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  nsf: 'bg-red-50 text-red-700 border-red-200',
}

export function FinancialsTab({ data }: { data: PropertyDetailData }) {
  const { recentPayments, recentExpenses, ytdIncome, ytdExpenses, mtdIncome, mtdExpenses } = data

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="YTD Income" value={formatCurrency(ytdIncome)} />
        <SummaryCard label="YTD Expenses" value={formatCurrency(ytdExpenses)} />
        <SummaryCard
          label="YTD NOI"
          value={formatCurrency(ytdIncome - ytdExpenses)}
          negative={ytdIncome - ytdExpenses < 0}
        />
        <SummaryCard label="MTD Income" value={formatCurrency(mtdIncome)} />
      </div>

      {/* Income ledger */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Income</CardTitle>
          <span className="text-xs text-muted-foreground">Last 20 transactions</span>
        </CardHeader>
        <CardContent className="p-0">
          {recentPayments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPayments.map(p => (
                  <tr key={p.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(p.date)}</td>
                    <td className="px-4 py-2.5">{PAYMENT_TYPE_LABEL[p.type] ?? p.type}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        PAYMENT_STATUS_COLOR[p.status] ?? 'bg-secondary text-foreground border-border'
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Expense ledger */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Expenses</CardTitle>
          <span className="text-xs text-muted-foreground">Last 20 transactions</span>
        </CardHeader>
        <CardContent className="p-0">
          {recentExpenses.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No expenses recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Vendor</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(e.date)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{e.category.replace(/_/g, ' ')}</span>
                      {e.subcategory && (
                        <span className="text-muted-foreground"> / {e.subcategory}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.vendor ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  negative,
}: {
  label: string
  value: string
  negative?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={cn('text-xl font-bold mt-0.5 tabular-nums', negative ? 'text-red-600' : 'text-foreground')}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
