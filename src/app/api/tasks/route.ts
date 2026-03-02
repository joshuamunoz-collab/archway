import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const tasks = await prisma.pmTask.findMany({
    include: {
      property: { select: { id: true, addressLine1: true } },
      cityNotice: { select: { id: true, noticeType: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, fullName: true } } },
      },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(tasks)
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()

  if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  if (!body.taskType) return NextResponse.json({ error: 'taskType is required' }, { status: 400 })

  const task = await prisma.pmTask.create({
    data: {
      propertyId: body.propertyId || null,
      cityNoticeId: body.cityNoticeId || null,
      taskType: body.taskType,
      priority: body.priority || 'medium',
      title: body.title.trim(),
      description: body.description?.trim() || null,
      assignedTo: body.assignedTo?.trim() || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: 'created',
    },
    include: {
      property: { select: { id: true, addressLine1: true } },
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'task',
      entityId: task.id,
      action: 'task_created',
      details: { title: task.title, taskType: task.taskType, priority: task.priority },
      userId: auth.user.id,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
