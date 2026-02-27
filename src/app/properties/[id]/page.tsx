import { notFound } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'
import { prisma } from '@/lib/prisma'
import { PropertyDetail } from '@/components/property/property-detail'
import type { PropertyDetailData, MonthlyChartPoint, CategoryChartPoint } from '@/types/property'
import { getCategoryLabel } from '@/lib/expense-categories'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const now = new Date()
  const ytdStart = new Date(now.getFullYear(), 0, 1)
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const trailing12Start = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [property, ytdIncomeAgg, ytdExpensesAgg, mtdIncomeAgg, mtdExpensesAgg, chartPayments, chartExpenses] = await Promise.all([
    prisma.property.findUnique({
      where: { id },
      include: {
        entity: { select: { id: true, name: true, pmFeePct: true } },
        leases: {
          where: { status: 'active' },
          include: { tenant: true },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
        insurancePolicies: { orderBy: { effectiveDate: 'desc' } },
        propertyTaxes: { orderBy: { taxYear: 'desc' } },
        cityNotices: { orderBy: { createdAt: 'desc' } },
        inspections: { orderBy: { scheduledDate: 'desc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
        photos: { orderBy: { uploadedAt: 'desc' } },
        payments: {
          orderBy: { date: 'desc' },
          take: 50,
          select: { id: true, date: true, amount: true, type: true, status: true, referenceNumber: true, notes: true },
        },
        expenses: {
          orderBy: { date: 'desc' },
          take: 50,
          select: { id: true, date: true, amount: true, category: true, subcategory: true, vendor: true, description: true, source: true },
        },
      },
    }),
    prisma.payment.aggregate({
      where: { propertyId: id, date: { gte: ytdStart }, status: { not: 'nsf' } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { propertyId: id, date: { gte: ytdStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { propertyId: id, date: { gte: mtdStart }, status: { not: 'nsf' } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { propertyId: id, date: { gte: mtdStart } },
      _sum: { amount: true },
    }),
    // Trailing 12-month payments for chart
    prisma.payment.findMany({
      where: { propertyId: id, date: { gte: trailing12Start }, status: { not: 'nsf' } },
      select: { date: true, amount: true },
    }),
    // Trailing 12-month expenses for chart
    prisma.expense.findMany({
      where: { propertyId: id, date: { gte: trailing12Start } },
      select: { date: true, amount: true, category: true },
    }),
  ])

  if (!property) notFound()

  // Build monthly chart data (trailing 12 months)
  const monthlyMap: Record<string, { income: number; expenses: number }> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = { income: 0, expenses: 0 }
  }
  for (const p of chartPayments) {
    const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`
    if (monthlyMap[key]) monthlyMap[key].income += Number(p.amount)
  }
  for (const e of chartExpenses) {
    const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`
    if (monthlyMap[key]) monthlyMap[key].expenses += Number(e.amount)
  }
  const monthlyChartData: MonthlyChartPoint[] = Object.entries(monthlyMap).map(([key, val]) => {
    const [yr, mo] = key.split('-')
    const d = new Date(Number(yr), Number(mo) - 1, 1)
    return {
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income: Math.round(val.income * 100) / 100,
      expenses: Math.round(val.expenses * 100) / 100,
    }
  })

  // Build expense-by-category data (YTD)
  const catMap: Record<string, number> = {}
  for (const e of chartExpenses) {
    const d = new Date(e.date)
    if (d >= ytdStart) {
      catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount)
    }
  }
  const expenseByCategoryData: CategoryChartPoint[] = Object.entries(catMap)
    .map(([category, amount]) => ({ category: getCategoryLabel(category), amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount)

  // Load activity log separately (entityType='property', entityId=id)
  const activityLog = await prisma.activityLog.findMany({
    where: { entityType: 'property', entityId: id },
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  // Serialize all Prisma Decimal and Date values for client
  const activeLease = property.leases[0] ?? null
  const data: PropertyDetailData = {
    id: property.id,
    entityId: property.entityId,
    entity: {
      id: property.entity.id,
      name: property.entity.name,
      pmFeePct: Number(property.entity.pmFeePct),
    },
    addressLine1: property.addressLine1,
    addressLine2: property.addressLine2,
    city: property.city,
    state: property.state,
    zip: property.zip,
    parcelNumber: property.parcelNumber,
    ward: property.ward,
    neighborhood: property.neighborhood,
    propertyType: property.propertyType,
    beds: property.beds,
    baths: property.baths !== null ? Number(property.baths) : null,
    sqft: property.sqft,
    yearBuilt: property.yearBuilt,
    isSection8: property.isSection8,
    status: property.status,
    vacantSince: property.vacantSince?.toISOString().split('T')[0] ?? null,
    notes: property.notes,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
    activeLease: activeLease ? {
      id: activeLease.id,
      tenantId: activeLease.tenantId,
      tenant: {
        id: activeLease.tenant.id,
        firstName: activeLease.tenant.firstName,
        lastName: activeLease.tenant.lastName,
        phone: activeLease.tenant.phone,
        email: activeLease.tenant.email,
        voucherNumber: activeLease.tenant.voucherNumber,
        phaCaseworker: activeLease.tenant.phaCaseworker,
        phaPhone: activeLease.tenant.phaPhone,
      },
      startDate: activeLease.startDate.toISOString().split('T')[0],
      endDate: activeLease.endDate?.toISOString().split('T')[0] ?? null,
      contractRent: Number(activeLease.contractRent),
      hapAmount: activeLease.hapAmount !== null ? Number(activeLease.hapAmount) : null,
      tenantCopay: activeLease.tenantCopay !== null ? Number(activeLease.tenantCopay) : null,
      utilityAllowance: activeLease.utilityAllowance !== null ? Number(activeLease.utilityAllowance) : null,
      paymentStandard: activeLease.paymentStandard !== null ? Number(activeLease.paymentStandard) : null,
      hapContractStart: activeLease.hapContractStart?.toISOString().split('T')[0] ?? null,
      hapContractEnd: activeLease.hapContractEnd?.toISOString().split('T')[0] ?? null,
      recertificationDate: activeLease.recertificationDate?.toISOString().split('T')[0] ?? null,
      status: activeLease.status,
      notes: activeLease.notes,
    } : null,
    insurancePolicies: property.insurancePolicies.map(p => ({
      id: p.id,
      carrier: p.carrier,
      policyNumber: p.policyNumber,
      policyType: p.policyType,
      premiumAnnual: p.premiumAnnual !== null ? Number(p.premiumAnnual) : null,
      liabilityLimit: p.liabilityLimit !== null ? Number(p.liabilityLimit) : null,
      premisesLimit: p.premisesLimit !== null ? Number(p.premisesLimit) : null,
      effectiveDate: p.effectiveDate?.toISOString().split('T')[0] ?? null,
      expirationDate: p.expirationDate?.toISOString().split('T')[0] ?? null,
      declarationUrl: p.declarationUrl,
      notes: p.notes,
    })),
    propertyTaxes: property.propertyTaxes.map(t => ({
      id: t.id,
      taxYear: t.taxYear,
      assessedValue: t.assessedValue !== null ? Number(t.assessedValue) : null,
      annualAmount: t.annualAmount !== null ? Number(t.annualAmount) : null,
      status: t.status,
      paidDate: t.paidDate?.toISOString().split('T')[0] ?? null,
      paidAmount: t.paidAmount !== null ? Number(t.paidAmount) : null,
      notes: t.notes,
    })),
    cityNotices: property.cityNotices.map(n => ({
      id: n.id,
      dateReceived: n.dateReceived.toISOString().split('T')[0],
      noticeType: n.noticeType,
      description: n.description,
      deadline: n.deadline?.toISOString().split('T')[0] ?? null,
      assignedTo: n.assignedTo,
      status: n.status,
      sentToPmDate: n.sentToPmDate?.toISOString().split('T')[0] ?? null,
      pmResponseDate: n.pmResponseDate?.toISOString().split('T')[0] ?? null,
      resolvedDate: n.resolvedDate?.toISOString().split('T')[0] ?? null,
      resolutionNotes: n.resolutionNotes,
      documentUrl: n.documentUrl,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
    inspections: property.inspections.map(i => ({
      id: i.id,
      inspectionType: i.inspectionType,
      scheduledDate: i.scheduledDate?.toISOString().split('T')[0] ?? null,
      completedDate: i.completedDate?.toISOString().split('T')[0] ?? null,
      inspector: i.inspector,
      result: i.result,
      deficiencies: i.deficiencies,
      reinspectionDeadline: i.reinspectionDeadline?.toISOString().split('T')[0] ?? null,
      notes: i.notes,
      createdAt: i.createdAt.toISOString(),
    })),
    documents: property.documents.map(d => ({
      id: d.id,
      docType: d.docType,
      filename: d.filename,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      uploadedAt: d.uploadedAt.toISOString(),
      notes: d.notes,
    })),
    photos: property.photos.map(p => ({
      id: p.id,
      category: p.category,
      caption: p.caption,
      fileUrl: p.fileUrl,
      takenAt: p.takenAt?.toISOString().split('T')[0] ?? null,
      uploadedAt: p.uploadedAt.toISOString(),
    })),
    recentActivity: activityLog.map(a => ({
      id: a.id,
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action,
      details: a.details as Record<string, unknown> | null,
      createdAt: a.createdAt.toISOString(),
      user: a.user ? { fullName: a.user.fullName } : null,
    })),
    recentPayments: property.payments.map(p => ({
      id: p.id,
      date: p.date.toISOString().split('T')[0],
      amount: Number(p.amount),
      type: p.type,
      status: p.status,
      referenceNumber: p.referenceNumber,
      notes: p.notes,
    })),
    recentExpenses: property.expenses.map(e => ({
      id: e.id,
      date: e.date.toISOString().split('T')[0],
      amount: Number(e.amount),
      category: e.category,
      subcategory: e.subcategory,
      vendor: e.vendor,
      description: e.description,
      source: e.source,
    })),
    ytdIncome: Number(ytdIncomeAgg._sum.amount ?? 0),
    ytdExpenses: Number(ytdExpensesAgg._sum.amount ?? 0),
    mtdIncome: Number(mtdIncomeAgg._sum.amount ?? 0),
    mtdExpenses: Number(mtdExpensesAgg._sum.amount ?? 0),
    monthlyChartData,
    expenseByCategoryData,
  }

  return (
    <AppShell>
      <PropertyDetail data={data} />
    </AppShell>
  )
}
