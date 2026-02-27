import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const rehab = await prisma.rehabProject.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, addressLine1: true, addressLine2: true } },
      milestones: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  })

  if (!rehab) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rehab)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = {}
  if (body.scope !== undefined) updateData.scope = body.scope?.trim() || null
  if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
  if (body.targetEndDate !== undefined) updateData.targetEndDate = body.targetEndDate ? new Date(body.targetEndDate) : null
  if (body.actualEndDate !== undefined) updateData.actualEndDate = body.actualEndDate ? new Date(body.actualEndDate) : null
  if (body.originalEstimate !== undefined) updateData.originalEstimate = body.originalEstimate ? parseFloat(body.originalEstimate) : null
  if (body.currentEstimate !== undefined) updateData.currentEstimate = body.currentEstimate ? parseFloat(body.currentEstimate) : null
  if (body.status !== undefined) updateData.status = body.status
  if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null

  const rehab = await prisma.rehabProject.update({
    where: { id },
    data: updateData,
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'rehab',
      entityId: id,
      action: 'rehab_updated',
      details: { changes: Object.keys(updateData) },
      userId: user.id,
    },
  })

  return NextResponse.json(rehab)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await prisma.rehabMilestone.deleteMany({ where: { rehabProjectId: id } })
  await prisma.rehabProject.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
