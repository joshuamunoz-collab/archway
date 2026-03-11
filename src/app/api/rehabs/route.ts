import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const rehabs = await prisma.rehabProject.findMany({
    include: {
      property: { select: { id: true, addressLine1: true, addressLine2: true, entity: { select: { name: true } } } },
      milestones: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Serialize Prisma Decimal fields
  const serialized = rehabs.map(r => ({
    ...r,
    originalEstimate: r.originalEstimate !== null ? Number(r.originalEstimate) : null,
    currentEstimate: r.currentEstimate !== null ? Number(r.currentEstimate) : null,
    actualCost: Number(r.actualCost),
  }))

  return NextResponse.json(serialized)
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()

  if (!body.propertyId) return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })

  const rehab = await prisma.rehabProject.create({
    data: {
      propertyId: body.propertyId,
      scope: body.scope?.trim() || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      targetEndDate: body.targetEndDate ? new Date(body.targetEndDate) : null,
      originalEstimate: body.originalEstimate ? parseFloat(body.originalEstimate) : null,
      currentEstimate: body.currentEstimate ? parseFloat(body.currentEstimate) : null,
      status: 'not_started',
      notes: body.notes?.trim() || null,
    },
    include: {
      property: { select: { id: true, addressLine1: true } },
    },
  })

  // Update property status to rehab
  await prisma.property.update({
    where: { id: body.propertyId },
    data: { status: 'rehab', vacantSince: null },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'rehab',
      entityId: rehab.id,
      action: 'rehab_created',
      details: { propertyId: body.propertyId, scope: body.scope },
      userId: auth.user.id,
    },
  })

  return NextResponse.json({
    ...rehab,
    originalEstimate: rehab.originalEstimate !== null ? Number(rehab.originalEstimate) : null,
    currentEstimate: rehab.currentEstimate !== null ? Number(rehab.currentEstimate) : null,
    actualCost: Number(rehab.actualCost),
  }, { status: 201 })
}
