'use client'

import Link from 'next/link'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface EntitySummary {
  id: string
  name: string
  pmFeePct: number
  ytdIncome: number
  ytdExpenses: number
}

interface MonthlyPoint {
  month: string
  income: number
  expenses: number
}

interface CategoryPoint {
  category: string
  amount: number
}

interface Props {
  ytdIncome: number
  ytdExpenses: number
  mtdIncome: number
  mtdExpenses: number
  monthlyChartData: MonthlyPoint[]
  expenseByCategoryData: CategoryPoint[]
  entitySummaries: EntitySummary[]
}

export function FinancialsDashboard({
  ytdIncome,
  ytdExpenses,
  mtdIncome,
  mtdExpenses,
  monthlyChartData,
  expenseByCategoryData,
  entitySummaries,
}: Props) {
  const ytdNoi = ytdIncome - ytdExpenses
  const mtdNoi = mtdIncome - mtdExpenses
  const hasChartData = monthlyChartData.some(d => d.income > 0 || d.expenses > 0)

  return (
    <div className="space-y-6">
      {/* Portfolio KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="YTD Income" value={formatCurrency(ytdIncome)} />
        <KpiCard label="YTD Expenses" value={formatCurrency(ytdExpenses)} />
        <KpiCard label="YTD NOI" value={formatCurrency(ytdNoi)} negative={ytdNoi < 0} />
        <KpiCard label="MTD NOI" value={formatCurrency(mtdNoi)} negative={mtdNoi < 0} />
      </div>

      {/* Charts */}
      {hasChartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Portfolio Income vs. Expenses (12 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyChartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : ''} contentStyle={{ fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={false} name="Income" />
                  <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} dot={false} name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {expenseByCategoryData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Portfolio Expenses by Category (YTD)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={expenseByCategoryData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} tickLine={false} width={120} />
                    <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : ''} contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="amount" fill="#2563EB" radius={[0, 3, 3, 0]} name="Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Entity P&L table */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">YTD by Entity</CardTitle>
          <Link href="/reports" className="text-xs text-primary hover:underline">Full Reports →</Link>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Entity</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Income</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Expenses</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">NOI</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">NOI %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entitySummaries.map(e => {
                const noi = e.ytdIncome - e.ytdExpenses
                const noiPct = e.ytdIncome > 0 ? Math.round((noi / e.ytdIncome) * 100) : 0
                return (
                  <tr key={e.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2.5 font-medium">{e.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(e.ytdIncome)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(e.ytdExpenses)}</td>
                    <td className={cn(
                      'px-4 py-2.5 text-right tabular-nums font-medium',
                      noi < 0 ? 'text-red-600' : 'text-emerald-600'
                    )}>
                      {formatCurrency(noi)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                      {e.ytdIncome > 0 ? `${noiPct}%` : '—'}
                    </td>
                  </tr>
                )
              })}
              {/* Totals */}
              <tr className="bg-secondary/50 font-semibold">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(entitySummaries.reduce((s, e) => s + e.ytdIncome, 0))}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(entitySummaries.reduce((s, e) => s + e.ytdExpenses, 0))}</td>
                <td className={cn(
                  'px-4 py-2.5 text-right tabular-nums',
                  ytdNoi < 0 ? 'text-red-600' : 'text-emerald-600'
                )}>
                  {formatCurrency(ytdNoi)}
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell" />
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MTD summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">MTD Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Income</span>
              <span className="font-medium tabular-nums">{formatCurrency(mtdIncome)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expenses</span>
              <span className="font-medium tabular-nums">{formatCurrency(mtdExpenses)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-semibold">Net Operating Income</span>
              <span className={cn('font-bold tabular-nums', mtdNoi < 0 ? 'text-red-600' : 'text-emerald-600')}>
                {formatCurrency(mtdNoi)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium mb-3">Quick Actions</p>
            <div className="space-y-2">
              <Link href="/reports" className="block text-sm text-primary hover:underline">
                → Generate detailed reports
              </Link>
              <Link href="/bills" className="block text-sm text-primary hover:underline">
                → Review PM bills
              </Link>
              <Link href="/import" className="block text-sm text-primary hover:underline">
                → Import transactions
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={cn('text-xl font-bold mt-0.5 tabular-nums', negative ? 'text-red-600' : 'text-foreground')}>{value}</p>
      </CardContent>
    </Card>
  )
}
