'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'

interface MonthlyData {
  month: string   // e.g. "Jan '25"
  income: number
  expenses: number
}

interface EntityIncome {
  name: string
  income: number
}

const ENTITY_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6']

const currencyFormatter = (v: number) =>
  v === 0 ? '$0' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

export function PortfolioCharts({
  monthlyData,
  entityIncome,
}: {
  monthlyData: MonthlyData[]
  entityIncome: EntityIncome[]
}) {
  const hasMonthlyData = monthlyData.some(m => m.income > 0 || m.expenses > 0)
  const hasEntityData = entityIncome.some(e => e.income > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Trailing 12 months */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Income vs. Expenses — Trailing 12 Months</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {!hasMonthlyData ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No financial data recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tickFormatter={currencyFormatter} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={false} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} dot={false} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Income by Entity */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">MTD Income by Entity</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {!hasEntityData ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No income recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={entityIncome} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tickFormatter={currencyFormatter} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="income" name="Income" radius={[3, 3, 0, 0]}>
                  {entityIncome.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={ENTITY_COLORS[index % ENTITY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
