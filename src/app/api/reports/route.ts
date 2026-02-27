import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/reports?type=rent_roll&entityId=...&startDate=...&endDate=...
 * Returns JSON data for client-side rendering into CSV/XLSX/PDF.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const entityId = searchParams.get('entityId') || undefined
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const dateFilter = {
    ...(startDate ? { gte: new Date(startDate) } : {}),
    ...(endDate ? { lte: new Date(endDate) } : {}),
  }

  switch (type) {
    case 'rent_roll': {
      const leases = await prisma.lease.findMany({
        where: {
          status: 'active',
          ...(entityId ? { property: { entityId } } : {}),
        },
        include: {
          property: {
            select: {
              id: true, addressLine1: true, addressLine2: true, ward: true, neighborhood: true,
              entity: { select: { name: true } },
            },
          },
          tenant: { select: { firstName: true, lastName: true, voucherNumber: true } },
        },
        orderBy: [{ property: { addressLine1: 'asc' } }],
      })

      const rows = leases.map(l => ({
        Address: l.property.addressLine1,
        Unit: l.property.addressLine2 ?? '',
        Entity: l.property.entity.name,
        Ward: l.property.ward ?? '',
        Neighborhood: l.property.neighborhood ?? '',
        Tenant: `${l.tenant.firstName} ${l.tenant.lastName}`,
        'Voucher #': l.tenant.voucherNumber ?? '',
        'Lease Start': l.startDate.toISOString().split('T')[0],
        'Lease End': l.endDate?.toISOString().split('T')[0] ?? '',
        'Contract Rent': Number(l.contractRent),
        'HAP Amount': l.hapAmount != null ? Number(l.hapAmount) : '',
        'Tenant Copay': l.tenantCopay != null ? Number(l.tenantCopay) : '',
        'Utility Allowance': l.utilityAllowance != null ? Number(l.utilityAllowance) : '',
        'Recert Date': l.recertificationDate?.toISOString().split('T')[0] ?? '',
      }))

      return NextResponse.json({ type, rows })
    }

    case 'vacancy': {
      const properties = await prisma.property.findMany({
        where: {
          status: { in: ['vacant', 'rehab', 'pending_inspection', 'pending_packet'] },
          ...(entityId ? { entityId } : {}),
        },
        include: {
          entity: { select: { name: true } },
          insurancePolicies: { orderBy: { effectiveDate: 'desc' }, take: 1 },
        },
        orderBy: { vacantSince: 'asc' },
      })

      const now = new Date()
      const rows = properties.map(p => {
        const days = p.vacantSince
          ? Math.floor((now.getTime() - p.vacantSince.getTime()) / 86_400_000)
          : 0
        const ins = p.insurancePolicies[0]
        return {
          Address: p.addressLine1,
          Entity: p.entity.name,
          Status: p.status,
          'Vacant Since': p.vacantSince?.toISOString().split('T')[0] ?? '',
          'Days Vacant': days,
          'Insurance Risk': days >= 60 ? 'Critical' : days >= 45 ? 'Urgent' : days >= 30 ? 'Watch' : 'Normal',
          'Insurance Carrier': ins?.carrier ?? '',
          'Policy Expires': ins?.expirationDate?.toISOString().split('T')[0] ?? '',
        }
      })

      return NextResponse.json({ type, rows })
    }

    case 'portfolio_pl': {
      const ytdStart = new Date(new Date().getFullYear(), 0, 1)
      const start = startDate ? new Date(startDate) : ytdStart
      const end = endDate ? new Date(endDate) : new Date()

      const properties = await prisma.property.findMany({
        where: entityId ? { entityId } : {},
        select: { id: true, addressLine1: true, entity: { select: { name: true } } },
        orderBy: { addressLine1: 'asc' },
      })

      const [payments, expenses] = await Promise.all([
        prisma.payment.groupBy({
          by: ['propertyId'],
          where: { date: { gte: start, lte: end }, status: { not: 'nsf' } },
          _sum: { amount: true },
        }),
        prisma.expense.groupBy({
          by: ['propertyId'],
          where: { date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ])

      const incomeMap = Object.fromEntries(payments.map(p => [p.propertyId, Number(p._sum.amount ?? 0)]))
      const expenseMap = Object.fromEntries(expenses.map(e => [e.propertyId, Number(e._sum.amount ?? 0)]))

      const rows = properties.map(p => {
        const income = incomeMap[p.id] ?? 0
        const expense = expenseMap[p.id] ?? 0
        return {
          Address: p.addressLine1,
          Entity: p.entity.name,
          Income: income,
          Expenses: expense,
          'Net Operating Income': income - expense,
        }
      })

      // Totals row
      const totalIncome = rows.reduce((s, r) => s + r.Income, 0)
      const totalExpenses = rows.reduce((s, r) => s + r.Expenses, 0)
      rows.push({
        Address: 'TOTAL',
        Entity: '',
        Income: totalIncome,
        Expenses: totalExpenses,
        'Net Operating Income': totalIncome - totalExpenses,
      })

      return NextResponse.json({ type, rows })
    }

    case 'entity_pl': {
      const entities = await prisma.entity.findMany({
        where: entityId ? { id: entityId } : {},
        include: { properties: { select: { id: true } } },
        orderBy: { name: 'asc' },
      })

      const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1)
      const end = endDate ? new Date(endDate) : new Date()

      const rows = []
      for (const entity of entities) {
        const propertyIds = entity.properties.map(p => p.id)
        const [incomeAgg, expenseAgg] = await Promise.all([
          prisma.payment.aggregate({
            where: { propertyId: { in: propertyIds }, date: { gte: start, lte: end }, status: { not: 'nsf' } },
            _sum: { amount: true },
          }),
          prisma.expense.aggregate({
            where: { propertyId: { in: propertyIds }, date: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
        ])
        const income = Number(incomeAgg._sum.amount ?? 0)
        const expenses = Number(expenseAgg._sum.amount ?? 0)
        rows.push({
          Entity: entity.name,
          Properties: propertyIds.length,
          Income: income,
          Expenses: expenses,
          NOI: income - expenses,
        })
      }

      return NextResponse.json({ type, rows })
    }

    case 'tax_summary': {
      const taxes = await prisma.propertyTax.findMany({
        where: { property: entityId ? { entityId } : {} },
        include: {
          property: { select: { addressLine1: true, entity: { select: { name: true } } } },
        },
        orderBy: [{ property: { addressLine1: 'asc' } }, { taxYear: 'desc' }],
      })

      const rows = taxes.map(t => ({
        Address: t.property.addressLine1,
        Entity: t.property.entity.name,
        'Tax Year': t.taxYear,
        'Assessed Value': t.assessedValue != null ? Number(t.assessedValue) : '',
        'Annual Amount': t.annualAmount != null ? Number(t.annualAmount) : '',
        Status: t.status,
        'Paid Date': t.paidDate?.toISOString().split('T')[0] ?? '',
        'Paid Amount': t.paidAmount != null ? Number(t.paidAmount) : '',
        Notes: t.notes ?? '',
      }))

      return NextResponse.json({ type, rows })
    }

    case 'city_notices': {
      const notices = await prisma.cityNotice.findMany({
        where: {
          status: { not: 'resolved' },
          property: entityId ? { entityId } : {},
        },
        include: {
          property: { select: { addressLine1: true, entity: { select: { name: true } } } },
        },
        orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      })

      const now = new Date()
      const rows = notices.map(n => ({
        Address: n.property.addressLine1,
        Entity: n.property.entity.name,
        'Notice Type': n.noticeType ?? '',
        Description: n.description,
        Status: n.status,
        'Date Received': n.dateReceived.toISOString().split('T')[0],
        Deadline: n.deadline?.toISOString().split('T')[0] ?? '',
        'Days Until Deadline': n.deadline
          ? Math.ceil((n.deadline.getTime() - now.getTime()) / 86_400_000)
          : '',
        'Assigned To': n.assignedTo ?? '',
      }))

      return NextResponse.json({ type, rows })
    }

    case 'pm_performance': {
      const tasks = await prisma.pmTask.findMany({
        include: { property: { select: { addressLine1: true } } },
        orderBy: { createdAt: 'desc' },
      })

      const rows = tasks.map(t => ({
        Title: t.title,
        Type: t.taskType,
        Priority: t.priority,
        Property: t.property?.addressLine1 ?? '',
        Status: t.status,
        'Assigned To': t.assignedTo ?? '',
        'Due Date': t.dueDate?.toISOString().split('T')[0] ?? '',
        'Created': t.createdAt.toISOString().split('T')[0],
        'Acknowledged': t.acknowledgedAt?.toISOString().split('T')[0] ?? '',
        'Completed': t.completedAt?.toISOString().split('T')[0] ?? '',
        'Response Hours': t.acknowledgedAt
          ? Math.round((t.acknowledgedAt.getTime() - t.createdAt.getTime()) / 3_600_000)
          : '',
      }))

      return NextResponse.json({ type, rows })
    }

    default:
      return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 })
  }
}
