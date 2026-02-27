export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/shared/app-shell'
import { TaskDetail } from '@/components/tasks/task-detail'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const task = await prisma.pmTask.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, addressLine1: true, addressLine2: true } },
      cityNotice: { select: { id: true, noticeType: true, description: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, fullName: true } } },
      },
    },
  })

  if (!task) notFound()

  const serialized = {
    id: task.id,
    propertyId: task.propertyId,
    property: task.property ?? null,
    cityNotice: task.cityNotice ?? null,
    taskType: task.taskType,
    priority: task.priority,
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo,
    dueDate: task.dueDate?.toISOString().split('T')[0] ?? null,
    acknowledgedAt: task.acknowledgedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    messages: task.messages.map(m => ({
      id: m.id,
      userId: m.userId,
      user: m.user,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    })),
  }

  return (
    <AppShell>
      <TaskDetail task={serialized} />
    </AppShell>
  )
}
