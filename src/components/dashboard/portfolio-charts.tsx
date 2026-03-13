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
const COLOR_PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6']
function getEntityColor(name: string): string {
  if (!ENTITY_COLOR_MAP.has(name)) {
    ENTITY_COLOR_MAP.set(name, COLOR_PALETTE[ENTITY_COLOR_MAP.size % COLOR_PALETTE.length])
  }
  return ENTITY_COLOR_MAP.get(name)!
}

// Compact currency for Y-axis: $0, $15k, $30k
function compactCurrency(v: number): string {
  if (v === 0) return '$0'
  if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000)}k`
  return `$${v}`
}

// Format "YYYY-MM" → "Jan '25"
function formatMonthShort(key: string): string {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// Fixed range: Jan 2025 → Jan 2026 (13 months)
function getFixedMonthKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i <= 12; i++) {
    const d = new Date(2025, i, 1) // Jan 2025 (i=0) through Jan 2026 (i=12)
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

function getLastImportTimestamp(): string | null {
  try {
    return localStorage.getItem('archway_last_import')
  } catch {
    return null
  }
}

function buildMonthlyFromLocal(
  data: LocalStorageData,
  entityFilter: string,
): MonthlyData[] {
  const keys = getFixedMonthKeys()
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

// Custom tooltip showing Month, Income, Expenses, Net
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const income = Number(payload[0]?.value ?? 0)
  const expenses = Number(payload[1]?.value ?? 0)
  const net = income - expenses
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-800 mb-1.5">{label}</p>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
            Income
          </span>
          <span className="font-medium tabular-nums">{formatCurrency(income)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#F87171]" />
            Expenses
          </span>
          <span className="font-medium tabular-nums">{formatCurrency(expenses)}</span>
        </div>
        <div className="border-t border-gray-100 pt-1 mt-1 flex items-center justify-between gap-4">
          <span className="text-gray-500">Net</span>
          <span className={`font-semibold tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(net)}
          </span>
        </div>
      </div>
    </div>
  )
}

// Custom label for horizontal bar ends
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarEndLabel(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props
  if (!value || value === 0) return null
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      fill="#374151"
      fontSize={11}
      fontWeight={500}
      dominantBaseline="central"
    >
      {formatCurrency(Number(value))}
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
  const [lastImport, setLastImport] = useState<string | null>(null)

  useEffect(() => {
    setLocalData(readLocalStorage())
    setLastImport(getLastImportTimestamp())
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
    ? 'Income vs. Expenses'
    : entityFilter

  return (
    <div className="space-y-4">
      {/* Last import timestamp */}
      {lastImport && (
        <p className="text-xs text-gray-400 text-right">
          Last imported: {new Date(lastImport).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(lastImport).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Income vs Expenses — Grouped Bar Chart */}
        <Card className="lg:col-span-2 shadow-none border border-gray-100">
          <CardHeader className="pb-1 pt-4 px-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-sm font-semibold text-gray-900">
                  {chartTitle}
                </CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Jan 2025 — Jan 2026</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 hidden sm:inline">Filter by Entity:</span>
                <select
                  value={entityFilter}
                  onChange={e => setEntityFilter(e.target.value)}
                  className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-600 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                >
                  <option value="all">All Entities</option>
                  {entityOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-4 pt-2">
            {!hasMonthlyData ? (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                No financial data recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
                  barCategoryGap="30%"
                  barGap={1}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    tickFormatter={compactCurrency}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 11, color: '#6B7280', paddingTop: 8 }}
                    align="center"
                  />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#F87171"
                    radius={[4, 4, 0, 0]}
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* MTD Income by Entity — Horizontal Bar Chart */}
        <Card className="shadow-none border border-gray-100">
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900">MTD Income by Entity</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-4 pt-2">
            {!hasEntityData ? (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                No income recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, entityIncome.length * 56 + 32)}>
                <BarChart
                  data={entityIncome}
                  layout="vertical"
                  margin={{ top: 4, right: 80, bottom: 4, left: 4 }}
                  barCategoryGap="24%"
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={compactCurrency}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#4B5563' }}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '...' : v}
                  />
                  <Tooltip
                    formatter={(v: unknown) => formatCurrency(Number(v))}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar
                    dataKey="income"
                    name="Income"
                    radius={[0, 4, 4, 0]}
                    animationDuration={500}
                    animationEasing="ease-out"
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
    </div>
  )
})
