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
  const task = await prisma.pmTask.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, addressLine1: true } },
      cityNotice: { select: { id: true, noticeType: true, description: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, fullName: true } } },
      },
    },
  })

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(task)
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

  if (body.title !== undefined) updateData.title = body.title.trim()
  if (body.description !== undefined) updateData.description = body.description?.trim() || null
  if (body.priority !== undefined) updateData.priority = body.priority
  if (body.taskType !== undefined) updateData.taskType = body.taskType
  if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo?.trim() || null
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if (body.propertyId !== undefined) updateData.propertyId = body.propertyId || null

  // Status transitions with side effects
  if (body.status !== undefined) {
    updateData.status = body.status
    const now = new Date()
    if (body.status === 'pm_acknowledged' || body.status === 'acknowledged') {
      updateData.acknowledgedAt = now
    }
    if (body.status === 'completed') {
      updateData.completedAt = now
    }
  }

  const task = await prisma.pmTask.update({
    where: { id },
    data: updateData,
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'task',
      entityId: id,
      action: 'task_updated',
      details: { changes: Object.keys(updateData) },
      userId: user.id,
    },
  })

  return NextResponse.json(task)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await prisma.pmTaskMessage.deleteMany({ where: { taskId: id } })
  await prisma.pmTask.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
