'use client'

import { memo, useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface StatusCounts {
  total: number
  occupied: number
  vacant: number
  rehab: number
  pending: number
}

interface KpiCardsProps {
  statusCounts: StatusCounts
  mtdIncome: number
  expectedMonthlyIncome: number
  mtdExpenses: number
  lastMonthExpenses: number
}

export const KpiCards = memo(function KpiCards({
  statusCounts,
  mtdIncome: serverMtdIncome,
  expectedMonthlyIncome: serverExpected,
  mtdExpenses: serverMtdExpenses,
  lastMonthExpenses,
}: KpiCardsProps) {
  const [financialSummary, setFinancialSummary] = useState({ income: 0, expenses: 0, noi: 0 })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('archway_financials_v2')
      if (!saved) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = JSON.parse(saved) as Record<string, any>
      const allMonths = [...new Set(
        Object.values(data).flatMap((p: Record<string, unknown>) => Object.keys(p))
      )].sort()
      const latestMonth = allMonths[allMonths.length - 1]
      if (!latestMonth) return
      let income = 0, expenses = 0
      for (const portfolio of Object.values(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const monthData = (portfolio as any)[latestMonth]
        if (!monthData) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const prop of monthData as any[]) {
          income += prop.rent || 0
          expenses += (prop.maintenance || 0) + (prop.pm_fee || 0)
        }
      }
      setFinancialSummary({ income, expenses, noi: income - expenses })
    } catch (e) {
      console.warn('Dashboard financial load failed', e)
    }
  }, [])

  // Use localStorage data when server data is $0
  const mtdIncome = serverMtdIncome > 0 ? serverMtdIncome : financialSummary.income
  const expectedMonthlyIncome = serverExpected > 0 ? serverExpected : financialSummary.income
  const mtdExpenses = serverMtdExpenses > 0 ? serverMtdExpenses : financialSummary.expenses

  const incomeProgress = expectedMonthlyIncome > 0
    ? Math.min(100, Math.round((mtdIncome / expectedMonthlyIncome) * 100))
    : 0

  const expenseDelta = lastMonthExpenses > 0
    ? ((mtdExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
    : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Portfolio Status */}
      <Card className="col-span-2 lg:col-span-1 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Portfolio</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">{statusCounts.total}</p>
          <p className="text-xs text-muted-foreground mb-3">total properties</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <Link href="/properties?status=occupied" className="flex items-center gap-1.5 hover:opacity-80">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-muted-foreground">Occupied</span>
              <span className="ml-auto font-semibold tabular-nums">{statusCounts.occupied}</span>
            </Link>
            <Link href="/properties?status=vacant" className="flex items-center gap-1.5 hover:opacity-80">
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-muted-foreground">Vacant</span>
              <span className="ml-auto font-semibold tabular-nums">{statusCounts.vacant}</span>
            </Link>
            <Link href="/properties?status=rehab" className="flex items-center gap-1.5 hover:opacity-80">
              <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
              <span className="text-muted-foreground">Rehab</span>
              <span className="ml-auto font-semibold tabular-nums">{statusCounts.rehab}</span>
            </Link>
            <Link href="/properties?status=pending" className="flex items-center gap-1.5 hover:opacity-80">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-muted-foreground">Pending</span>
              <span className="ml-auto font-semibold tabular-nums">{statusCounts.pending}</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* MTD Income */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">MTD Income</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(mtdIncome)}</p>
          <p className="text-xs text-muted-foreground mb-3">
            {mtdIncome > 0
              ? `of ${formatCurrency(expectedMonthlyIncome)} collected`
              : `of ${formatCurrency(expectedMonthlyIncome)} expected`}
          </p>
          <Progress value={incomeProgress} className="h-1.5 mb-1 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-blue-500" />
          <p className="text-xs text-muted-foreground">{mtdIncome > 0 ? '100% collected' : `${incomeProgress}% collected`}</p>
        </CardContent>
      </Card>

      {/* MTD Expenses */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">MTD Expenses</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(mtdExpenses)}</p>
          {expenseDelta !== null && (
            <p className={cn(
              'text-xs mt-1',
              expenseDelta > 10 ? 'text-red-600' : expenseDelta < -10 ? 'text-emerald-600' : 'text-muted-foreground'
            )}>
              {expenseDelta > 0 ? '+' : ''}{expenseDelta.toFixed(0)}% vs last month
            </p>
          )}
          {expenseDelta === null && (
            <p className="text-xs text-muted-foreground mt-1">No prior month data</p>
          )}
        </CardContent>
      </Card>

    </div>
  )
})
