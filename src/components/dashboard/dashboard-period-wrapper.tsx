'use client'

import { useState, useEffect } from 'react'
import { KpiCards } from './kpi-cards'

interface StatusCounts {
  total: number
  occupied: number
  vacant: number
  rehab: number
  pending: number
}

interface Props {
  statusCounts: StatusCounts
  mtdIncome: number
  expectedMonthlyIncome: number
  mtdExpenses: number
  lastMonthExpenses: number
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function DashboardPeriodWrapper({
  statusCounts,
  mtdIncome,
  expectedMonthlyIncome,
  mtdExpenses,
  lastMonthExpenses,
}: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState('MTD')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('archway_financials_v2')
      if (!saved) return
      const data = JSON.parse(saved) as Record<string, Record<string, unknown>>
      const months = [...new Set(
        Object.values(data).flatMap(p => Object.keys(p))
      )].sort()
      setAvailableMonths(months)
    } catch {
      // ignore
    }
  }, [])

  const subtitleText = selectedPeriod === 'MTD'
    ? `Portfolio overview for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    : selectedPeriod === 'YTD'
      ? `Portfolio overview — Year to Date (${new Date().getFullYear()})`
      : `Portfolio overview for ${formatMonthLabel(selectedPeriod)}`

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subtitleText}</p>
        </div>
        {availableMonths.length > 0 && (
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="MTD">Current Month</option>
            <option value="YTD">YTD (All Months)</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
        )}
      </div>

      <KpiCards
        statusCounts={statusCounts}
        mtdIncome={mtdIncome}
        expectedMonthlyIncome={expectedMonthlyIncome}
        mtdExpenses={mtdExpenses}
        lastMonthExpenses={lastMonthExpenses}
        selectedPeriod={selectedPeriod}
      />
    </>
  )
}
