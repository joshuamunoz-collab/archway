import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rehabs = await prisma.rehabProject.findMany({
    include: {
      property: { select: { id: true, addressLine1: true, addressLine2: true, entity: { select: { name: true } } } },
      milestones: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(rehabs)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      userId: user.id,
    },
  })

  return NextResponse.json(rehab, { status: 201 })
}
