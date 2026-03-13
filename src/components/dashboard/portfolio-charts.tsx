'use client'

import { memo, useState, useEffect } from 'react'
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

const tooltipFormatter = (v: unknown) => formatCurrency(Number(v))

// Parse "January 2025" → { year: 2025, monthIndex: 0 }
function parseMonthLabel(label: string): { year: number; monthIndex: number } | null {
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  }
  const parts = label.trim().split(/\s+/)
  if (parts.length < 2) return null
  const monthIndex = months[parts[0].toLowerCase()]
  const year = parseInt(parts[1], 10)
  if (monthIndex === undefined || isNaN(year)) return null
  return { year, monthIndex }
}

// Format month for chart axis: "Jan '25"
function formatMonthShort(monthIndex: number, year: number): string {
  const d = new Date(year, monthIndex, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChartsFromLocalStorage(): { monthly: MonthlyData[]; entityIncome: EntityIncome[] } | null {
  try {
    const saved = localStorage.getItem('archway_financials_v2')
    if (!saved) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = JSON.parse(saved) as Record<string, Record<string, any[]>>
    if (!data || Object.keys(data).length === 0) return null

    const now = new Date()

    // Build trailing 12 months chart data
    const monthlyMap = new Map<string, { income: number; expenses: number }>()

    // Initialize 12 month buckets
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap.set(key, { income: 0, expenses: 0 })
    }

    // Aggregate from all entities and months
    for (const [, months] of Object.entries(data)) {
      for (const [monthLabel, properties] of Object.entries(months)) {
        const parsed = parseMonthLabel(monthLabel)
        if (!parsed) continue
        const key = `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, '0')}`
        const bucket = monthlyMap.get(key)
        if (!bucket) continue // outside trailing 12 months
        for (const prop of properties) {
          bucket.income += prop.rent || 0
          bucket.expenses += (prop.maintenance || 0) + (prop.pm_fee || 0)
        }
      }
    }

    const monthly: MonthlyData[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = monthlyMap.get(key) ?? { income: 0, expenses: 0 }
      monthly.push({
        month: formatMonthShort(d.getMonth(), d.getFullYear()),
        income: Math.round(bucket.income * 100) / 100,
        expenses: Math.round(bucket.expenses * 100) / 100,
      })
    }

    // Build MTD entity income
    const currentMonthNames = [
      now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      // Also try without year for flexibility
    ]

    const entityIncome: EntityIncome[] = []
    for (const [entityName, months] of Object.entries(data)) {
      let income = 0
      for (const monthName of currentMonthNames) {
        const properties = months[monthName]
        if (!properties) continue
        for (const prop of properties) {
          income += prop.rent || 0
        }
      }
      entityIncome.push({
        name: entityName.split(' ')[0],
        income: Math.round(income * 100) / 100,
      })
    }

    return { monthly, entityIncome }
  } catch {
    return null
  }
}

export const PortfolioCharts = memo(function PortfolioCharts({
  monthlyData: serverMonthlyData,
  entityIncome: serverEntityIncome,
}: {
  monthlyData: MonthlyData[]
  entityIncome: EntityIncome[]
}) {
  const [localData, setLocalData] = useState<{ monthly: MonthlyData[]; entityIncome: EntityIncome[] } | null>(null)

  useEffect(() => {
    setLocalData(buildChartsFromLocalStorage())
  }, [])

  // Use server data if it has values, otherwise fall back to localStorage
  const serverHasMonthly = serverMonthlyData.some(m => m.income > 0 || m.expenses > 0)
  const serverHasEntity = serverEntityIncome.some(e => e.income > 0)

  const monthlyData = serverHasMonthly ? serverMonthlyData : (localData?.monthly ?? serverMonthlyData)
  const entityIncome = serverHasEntity ? serverEntityIncome : (localData?.entityIncome ?? serverEntityIncome)

  const hasMonthlyData = monthlyData.some(m => m.income > 0 || m.expenses > 0)
  const hasEntityData = entityIncome.some(e => e.income > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Trailing 12 months */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-semibold text-foreground">Income vs. Expenses — Trailing 12 Months</CardTitle>
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
                <Tooltip formatter={tooltipFormatter} />
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
          <CardTitle className="text-base font-semibold text-foreground">MTD Income by Entity</CardTitle>
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
                <Tooltip formatter={tooltipFormatter} />
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
})
