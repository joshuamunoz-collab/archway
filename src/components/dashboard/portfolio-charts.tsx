'use client'

import { memo, useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'

interface MonthlyData {
  month: string
  income: number
  expenses: number
}

interface EntityIncome {
  name: string
  income: number
}

// Consistent entity color map — stable across renders
const ENTITY_COLOR_MAP = new Map<string, string>()
const COLOR_PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6']
function getEntityColor(name: string): string {
  if (!ENTITY_COLOR_MAP.has(name)) {
    ENTITY_COLOR_MAP.set(name, COLOR_PALETTE[ENTITY_COLOR_MAP.size % COLOR_PALETTE.length])
  }
  return ENTITY_COLOR_MAP.get(name)!
}

// Compact currency for Y-axis: $0, $10k, $50k, $100k
function compactCurrency(v: number): string {
  if (v === 0) return '$0'
  if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000)}k`
  return `$${v}`
}

const tooltipFormatter = (v: unknown) => formatCurrency(Number(v))

// Format "YYYY-MM" → "Apr '25"
function formatMonthShort(key: string): string {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// Get trailing 12 month keys in order
function getTrailing12MonthKeys(): string[] {
  const now = new Date()
  const keys: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

// Get current month key "YYYY-MM"
function getCurrentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

interface LocalStorageData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [entityName: string]: Record<string, any[]>
}

function readLocalStorage(): LocalStorageData | null {
  try {
    const saved = localStorage.getItem('archway_financials_v2')
    if (!saved) return null
    const data = JSON.parse(saved) as LocalStorageData
    if (!data || Object.keys(data).length === 0) return null
    return data
  } catch {
    return null
  }
}

function buildMonthlyFromLocal(
  data: LocalStorageData,
  entityFilter: string,
): MonthlyData[] {
  const keys = getTrailing12MonthKeys()
  const buckets = new Map<string, { income: number; expenses: number }>()
  for (const k of keys) buckets.set(k, { income: 0, expenses: 0 })

  for (const [entityName, months] of Object.entries(data)) {
    if (entityFilter !== 'all' && entityName !== entityFilter) continue
    for (const [monthKey, properties] of Object.entries(months)) {
      const bucket = buckets.get(monthKey)
      if (!bucket) continue
      for (const prop of properties) {
        bucket.income += prop.rent || 0
        bucket.expenses += (prop.maintenance || 0) + (prop.pm_fee || 0)
      }
    }
  }

  return keys.map(k => ({
    month: formatMonthShort(k),
    income: Math.round((buckets.get(k)?.income ?? 0) * 100) / 100,
    expenses: Math.round((buckets.get(k)?.expenses ?? 0) * 100) / 100,
  }))
}

function buildEntityIncomeFromLocal(data: LocalStorageData): EntityIncome[] {
  const currentMonth = getCurrentMonthKey()
  const result: EntityIncome[] = []

  for (const [entityName, months] of Object.entries(data)) {
    let income = 0
    const properties = months[currentMonth]
    if (properties) {
      for (const prop of properties) {
        income += prop.rent || 0
      }
    }
    result.push({
      name: entityName,
      income: Math.round(income * 100) / 100,
    })
  }

  return result.sort((a, b) => b.income - a.income)
}

// Custom label for horizontal bar ends
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarEndLabel(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props
  if (!value || value === 0) return null
  return (
    <text
      x={x + width + 4}
      y={y + height / 2}
      fill="#374151"
      fontSize={11}
      fontWeight={500}
      dominantBaseline="central"
    >
      {compactCurrency(Number(value))}
    </text>
  )
}

export const PortfolioCharts = memo(function PortfolioCharts({
  monthlyData: serverMonthlyData,
  entityIncome: serverEntityIncome,
  entityNames: serverEntityNames,
}: {
  monthlyData: MonthlyData[]
  entityIncome: EntityIncome[]
  entityNames: string[]
}) {
  const [localData, setLocalData] = useState<LocalStorageData | null>(null)
  const [entityFilter, setEntityFilter] = useState('all')

  useEffect(() => {
    setLocalData(readLocalStorage())
  }, [])

  // Determine entity names from localStorage or server
  const entityOptions = useMemo(() => {
    if (localData) return Object.keys(localData).sort()
    return serverEntityNames
  }, [localData, serverEntityNames])

  // Assign colors consistently on mount
  useEffect(() => {
    for (const name of entityOptions) getEntityColor(name)
  }, [entityOptions])

  // Build monthly data with entity filter support
  const monthlyData = useMemo(() => {
    if (localData) return buildMonthlyFromLocal(localData, entityFilter)
    return serverMonthlyData
  }, [localData, entityFilter, serverMonthlyData])

  // Build entity income from localStorage or server
  const entityIncome = useMemo(() => {
    if (localData) return buildEntityIncomeFromLocal(localData)
    return serverEntityIncome
  }, [localData, serverEntityIncome])

  const hasMonthlyData = monthlyData.some(m => m.income > 0 || m.expenses > 0)
  const hasEntityData = entityIncome.some(e => e.income > 0)

  // Dynamic chart title based on filter
  const chartTitle = entityFilter === 'all'
    ? 'Income vs. Expenses — Trailing 12 Months'
    : `${entityFilter} — Trailing 12 Months`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Trailing 12 months — Grouped Bar Chart */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <CardTitle className="text-base font-semibold text-foreground leading-tight">
              {chartTitle}
            </CardTitle>
            <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value)}
              className="shrink-0 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Entities</option>
              {entityOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 pb-4">
          {!hasMonthlyData ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              No financial data recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={monthlyData}
                margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
                barCategoryGap="18%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  angle={-45}
                  textAnchor="end"
                  height={40}
                  interval={0}
                />
                <YAxis
                  tickFormatter={compactCurrency}
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#2563EB"
                  radius={[3, 3, 0, 0]}
                  animationDuration={400}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#F97316"
                  radius={[3, 3, 0, 0]}
                  animationDuration={400}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* MTD Income by Entity — Horizontal Bar Chart */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-semibold text-foreground">MTD Income by Entity</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 pb-4">
          {!hasEntityData ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              No income recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, entityIncome.length * 52 + 32)}>
              <BarChart
                data={entityIncome}
                layout="vertical"
                margin={{ top: 4, right: 60, bottom: 4, left: 4 }}
                barCategoryGap="28%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={compactCurrency}
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#374151' }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '...' : v}
                />
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                  labelFormatter={(label) => String(label)}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  radius={[0, 4, 4, 0]}
                  animationDuration={400}
                >
                  {entityIncome.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getEntityColor(entry.name)} />
                  ))}
                  <LabelList dataKey="income" content={BarEndLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
})
