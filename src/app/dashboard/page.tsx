import { AppShell } from '@/components/shared/app-shell'
import { prisma } from '@/lib/prisma'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { AlertPanels } from '@/components/dashboard/alert-panels'
import { PortfolioCharts } from '@/components/dashboard/portfolio-charts'
import { PropertyTable } from '@/components/property/property-table'
import { getVacancyDays } from '@/lib/vacancy'

export default async function DashboardPage() {
  const now = new Date()
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lmStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lmEnd    = new Date(now.getFullYear(), now.getMonth(), 0)
  const in60Days = new Date(now.getTime() + 60 * 86_400_000)
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  const [
    properties,
    activeLeaseSum,
    mtdPayments,
    mtdExpenseSum,
    lmExpenseSum,
    openNotices,
    expiringLeases,
    trailingPayments,
    trailingExpenses,
    entities,
    overdueTasks,
    unacknowledgedTasks,
  ] = await Promise.all([
    prisma.property.findMany({
      select: {
        id: true,
        addressLine1: true,
        addressLine2: true,
        status: true,
        vacantSince: true,
        isSection8: true,
        propertyType: true,
        beds: true,
        baths: true,
        neighborhood: true,
        ward: true,
        entity: { select: { id: true, name: true } },
      },
      orderBy: { addressLine1: 'asc' },
    }),
    prisma.lease.aggregate({
      where: { status: 'active' },
      _sum: { contractRent: true },
    }),
    prisma.payment.aggregate({
      where: { date: { gte: mtdStart }, status: { not: 'nsf' } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: mtdStart } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: lmStart, lte: lmEnd } },
      _sum: { amount: true },
    }),
    prisma.cityNotice.findMany({
      where: { status: { in: ['open', 'overdue', 'sent_to_pm'] } },
      select: {
        id: true,
        noticeType: true,
        description: true,
        deadline: true,
        status: true,
        property: { select: { id: true, addressLine1: true } },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      take: 10,
    }),
    prisma.lease.findMany({
      where: { status: 'active', endDate: { lte: in60Days, gte: now } },
      select: {
        id: true,
        endDate: true,
        property: { select: { id: true, addressLine1: true } },
        tenant: { select: { firstName: true, lastName: true } },
      },
      orderBy: { endDate: 'asc' },
      take: 10,
    }),
    prisma.payment.findMany({
      where: { date: { gte: twelveMonthsAgo }, status: { not: 'nsf' } },
      select: { date: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: twelveMonthsAgo } },
      select: { date: true, amount: true },
    }),
    prisma.entity.findMany({ select: { id: true, name: true } }),
    // Overdue tasks: past due date, not completed
    prisma.pmTask.findMany({
      where: {
        status: { not: 'completed' },
        dueDate: { lt: now },
      },
      select: {
        id: true, title: true, priority: true, dueDate: true,
        property: { select: { addressLine1: true } },
      },
      take: 10,
      orderBy: { dueDate: 'asc' },
    }),
    // Unacknowledged tasks: created >48h ago, not yet acknowledged/in-progress/completed
    prisma.pmTask.findMany({
      where: {
        status: { in: ['created', 'sent_to_pm'] },
        createdAt: { lt: cutoff48h },
      },
      select: {
        id: true, title: true, priority: true, dueDate: true,
        property: { select: { addressLine1: true } },
      },
      take: 10,
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // ── Status counts ────────────────────────────────────────────────────────────
  const statusCounts = {
    total:    properties.length,
    occupied: properties.filter(p => p.status === 'occupied').length,
    vacant:   properties.filter(p => p.status === 'vacant').length,
    rehab:    properties.filter(p => p.status === 'rehab').length,
    pending:  properties.filter(p => p.status === 'pending_inspection' || p.status === 'pending_packet').length,
  }

  // ── Vacancy alerts ───────────────────────────────────────────────────────────
  const vacantProps = properties.filter(p => p.status === 'vacant' && p.vacantSince)
  const highRiskVacant = vacantProps
    .filter(p => getVacancyDays(p.vacantSince?.toISOString()) >= 45)
    .map(p => ({
      id: p.id,
      addressLine1: p.addressLine1,
      vacantSince: p.vacantSince?.toISOString() ?? null,
      entityName: p.entity.name,
    }))
  const watchVacant = vacantProps
    .filter(p => {
      const d = getVacancyDays(p.vacantSince?.toISOString())
      return d >= 30 && d < 45
    })
    .map(p => ({
      id: p.id,
      addressLine1: p.addressLine1,
      vacantSince: p.vacantSince?.toISOString() ?? null,
      entityName: p.entity.name,
    }))

  // ── Financials ───────────────────────────────────────────────────────────────
  const mtdIncome     = Number(mtdPayments._sum.amount ?? 0)
  const mtdExpenses   = Number(mtdExpenseSum._sum.amount ?? 0)
  const lmExpenses    = Number(lmExpenseSum._sum.amount ?? 0)
  const expectedIncome = Number(activeLeaseSum._sum.contractRent ?? 0)

  // ── 12-month chart data ──────────────────────────────────────────────────────
  function groupByMonth(rows: { date: Date; amount: { toNumber(): number } | number }[]) {
    const map = new Map<string, number>()
    for (const r of rows) {
      const d = r.date
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const amt = typeof r.amount === 'object' ? r.amount.toNumber() : Number(r.amount)
      map.set(key, (map.get(key) ?? 0) + amt)
    }
    return map
  }

  const paymentsByMonth = groupByMonth(trailingPayments as { date: Date; amount: { toNumber(): number } }[])
  const expensesByMonth = groupByMonth(trailingExpenses as { date: Date; amount: { toNumber(): number } }[])

  const monthlyData: { month: string; income: number; expenses: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyData.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income:   paymentsByMonth.get(key) ?? 0,
      expenses: expensesByMonth.get(key) ?? 0,
    })
  }

  // ── MTD income by entity ─────────────────────────────────────────────────────
  // For now use property counts as proxy; full entity income requires join
  const entityIncome = entities.map(e => ({
    name: e.name.split(' ')[0], // first word for brevity
    income: 0, // placeholder until payment data exists
  }))

  // ── Serialize for client components ─────────────────────────────────────────
  const tableRows = properties.map(p => ({
    id: p.id,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2 ?? null,
    status: p.status,
    entityName: p.entity.name,
    isSection8: p.isSection8,
    propertyType: p.propertyType ?? null,
    beds: p.beds ?? null,
    baths: p.baths !== null && p.baths !== undefined ? Number(p.baths) : null,
    neighborhood: p.neighborhood ?? null,
    ward: p.ward ?? null,
    vacantSince: p.vacantSince?.toISOString().split('T')[0] ?? null,
  }))

  const entityNames = entities.map(e => e.name)

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Portfolio overview for {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* KPI Cards */}
        <KpiCards
          statusCounts={statusCounts}
          mtdIncome={mtdIncome}
          expectedMonthlyIncome={expectedIncome}
          mtdExpenses={mtdExpenses}
          lastMonthExpenses={lmExpenses}
          highRiskVacantCount={highRiskVacant.length}
        />

        {/* Alert Panels */}
        <AlertPanels
          highRiskVacant={highRiskVacant}
          watchVacant={watchVacant}
          openNotices={openNotices.map(n => ({
            id: n.id,
            propertyId: n.property.id,
            propertyAddress: n.property.addressLine1,
            noticeType: n.noticeType,
            description: n.description,
            deadline: n.deadline?.toISOString().split('T')[0] ?? null,
            status: n.status,
          }))}
          expiringLeases={expiringLeases.map(l => ({
            id: l.id,
            propertyId: l.property.id,
            propertyAddress: l.property.addressLine1,
            tenantName: `${l.tenant.firstName} ${l.tenant.lastName}`,
            endDate: l.endDate?.toISOString().split('T')[0] ?? '',
          }))}
          overdueTasks={overdueTasks.map(t => ({
            id: t.id,
            title: t.title,
            propertyAddress: t.property?.addressLine1 ?? null,
            dueDate: t.dueDate?.toISOString().split('T')[0] ?? null,
            priority: t.priority,
            isUnacknowledged: false,
          }))}
          unacknowledgedTasks={unacknowledgedTasks.map(t => ({
            id: t.id,
            title: t.title,
            propertyAddress: t.property?.addressLine1 ?? null,
            dueDate: t.dueDate?.toISOString().split('T')[0] ?? null,
            priority: t.priority,
            isUnacknowledged: true,
          }))}
        />

        {/* Charts */}
        <PortfolioCharts monthlyData={monthlyData} entityIncome={entityIncome} />

        {/* Property Table */}
        <div className="bg-white rounded-xl border border-border p-5">
          <PropertyTable data={tableRows} entityNames={entityNames} />
        </div>
      </div>
    </AppShell>
  )
}
