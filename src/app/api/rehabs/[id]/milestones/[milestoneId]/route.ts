import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id, milestoneId } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = (body.name ?? '').trim()
  if (body.targetDate !== undefined) updateData.targetDate = body.targetDate ? new Date(body.targetDate) : null
  if (body.actualDate !== undefined) updateData.actualDate = body.actualDate ? new Date(body.actualDate) : null
  if (body.status !== undefined) updateData.status = body.status
  if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null

  try {
    const milestone = await prisma.rehabMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    })

    await prisma.activityLog.create({
      data: {
        entityType: 'rehab',
        entityId: id,
        action: 'milestone_updated',
        details: { milestoneId, changes: Object.keys(updateData) },
        userId: auth.user.id,
      },
    })

    return NextResponse.json(milestone)
  } catch {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id, milestoneId } = await params

  try {
    await prisma.rehabMilestone.delete({ where: { id: milestoneId } })

    await prisma.activityLog.create({
      data: {
        entityType: 'rehab',
        entityId: id,
        action: 'milestone_deleted',
        details: { milestoneId },
        userId: auth.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }
}
