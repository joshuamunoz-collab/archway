export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/shared/app-shell'
import { prisma } from '@/lib/prisma'
import { FinancialsDashboard } from '@/components/financials/financials-dashboard'
import { getCategoryLabel } from '@/lib/expense-categories'

export default async function FinancialsPage() {
  const now = new Date()
  const ytdStart = new Date(now.getFullYear(), 0, 1)
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const trailing12Start = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    entities,
    ytdPayments,
    ytdExpenses,
    mtdPayments,
    mtdExpenses,
    trailingPayments,
    trailingExpenses,
    entityPayments,
    entityExpenses,
  ] = await Promise.all([
    prisma.entity.findMany({
      select: { id: true, name: true, pmFeePct: true },
      orderBy: { name: 'asc' },
    }),
    prisma.payment.aggregate({
      where: { date: { gte: ytdStart }, status: { not: 'nsf' } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: ytdStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { date: { gte: mtdStart }, status: { not: 'nsf' } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: mtdStart } },
      _sum: { amount: true },
    }),
    // Trailing 12m for portfolio chart
    prisma.payment.findMany({
      where: { date: { gte: trailing12Start }, status: { not: 'nsf' } },
      select: { date: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: trailing12Start } },
      select: { date: true, amount: true, category: true },
    }),
    // YTD by entity
    prisma.payment.groupBy({
      by: ['propertyId'],
      where: { date: { gte: ytdStart }, status: { not: 'nsf' } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ['propertyId'],
      where: { date: { gte: ytdStart } },
      _sum: { amount: true },
    }),
  ])

  // Build monthly chart
  const monthlyMap: Record<string, { income: number; expenses: number }> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = { income: 0, expenses: 0 }
  }
  for (const p of trailingPayments) {
    const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`
    if (monthlyMap[key]) monthlyMap[key].income += Number(p.amount)
  }
  for (const e of trailingExpenses) {
    const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`
    if (monthlyMap[key]) monthlyMap[key].expenses += Number(e.amount)
  }
  const monthlyChartData = Object.entries(monthlyMap).map(([key, val]) => {
    const [yr, mo] = key.split('-')
    const d = new Date(Number(yr), Number(mo) - 1, 1)
    return {
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income: Math.round(val.income * 100) / 100,
      expenses: Math.round(val.expenses * 100) / 100,
    }
  })

  // Build expense by category
  const catMap: Record<string, number> = {}
  for (const e of trailingExpenses) {
    const d = new Date(e.date)
    if (d >= ytdStart) {
      catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount)
    }
  }
  const expenseByCategoryData = Object.entries(catMap)
    .map(([cat, amt]) => ({ category: getCategoryLabel(cat), amount: Math.round(amt * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount)

  // Get property→entity map to aggregate per entity
  const properties = await prisma.property.findMany({
    select: { id: true, entityId: true },
  })
  const propEntityMap = Object.fromEntries(properties.map(p => [p.id, p.entityId]))

  const entityIncomeMap: Record<string, number> = {}
  const entityExpenseMap: Record<string, number> = {}
  for (const p of entityPayments) {
    if (!p.propertyId) continue
    const eid = propEntityMap[p.propertyId]
    if (!eid) continue
    entityIncomeMap[eid] = (entityIncomeMap[eid] ?? 0) + Number(p._sum.amount ?? 0)
  }
  for (const e of entityExpenses) {
    if (!e.propertyId) continue
    const eid = propEntityMap[e.propertyId]
    if (!eid) continue
    entityExpenseMap[eid] = (entityExpenseMap[eid] ?? 0) + Number(e._sum.amount ?? 0)
  }

  const entitySummaries = entities.map(e => ({
    id: e.id,
    name: e.name,
    pmFeePct: Number(e.pmFeePct),
    ytdIncome: entityIncomeMap[e.id] ?? 0,
    ytdExpenses: entityExpenseMap[e.id] ?? 0,
  }))

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financials</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Portfolio financial overview for {now.getFullYear()}
          </p>
        </div>
        <FinancialsDashboard
          ytdIncome={Number(ytdPayments._sum.amount ?? 0)}
          ytdExpenses={Number(ytdExpenses._sum.amount ?? 0)}
          mtdIncome={Number(mtdPayments._sum.amount ?? 0)}
          mtdExpenses={Number(mtdExpenses._sum.amount ?? 0)}
          monthlyChartData={monthlyChartData}
          expenseByCategoryData={expenseByCategoryData}
          entitySummaries={entitySummaries}
        />
      </div>
    </AppShell>
  )
}
