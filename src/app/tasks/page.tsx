export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/shared/app-shell'
import { prisma } from '@/lib/prisma'
import { TasksTable } from '@/components/tasks/tasks-table'

export default async function TasksPage() {
  const now = new Date()
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  const [tasks, properties] = await Promise.all([
    prisma.pmTask.findMany({
      include: {
        property: { select: { id: true, addressLine1: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 1 },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.property.findMany({
      select: { id: true, addressLine1: true },
      orderBy: { addressLine1: 'asc' },
    }),
  ])

  const serialized = tasks.map(t => ({
    id: t.id,
    propertyId: t.propertyId,
    property: t.property ? { id: t.property.id, addressLine1: t.property.addressLine1 } : null,
    cityNoticeId: t.cityNoticeId,
    taskType: t.taskType,
    priority: t.priority,
    title: t.title,
    description: t.description,
    assignedTo: t.assignedTo,
    dueDate: t.dueDate?.toISOString().split('T')[0] ?? null,
    acknowledgedAt: t.acknowledgedAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    messageCount: t.messages.length,
  }))

  // PM performance metrics
  const allTasks = serialized
  const completed = allTasks.filter(t => t.status === 'completed')
  const overdue = allTasks.filter(t =>
    t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now
  )
  const unacknowledged = allTasks.filter(t =>
    !['pm_acknowledged', 'in_progress', 'completed'].includes(t.status) &&
    new Date(t.createdAt) < cutoff48h
  )

  const completionRate = allTasks.length > 0
    ? Math.round((completed.length / allTasks.length) * 100)
    : 0

  // Average response time (create → acknowledge) for tasks that were acknowledged
  const acknowledgedTasks = tasks.filter(t => t.acknowledgedAt)
  const avgResponseHours = acknowledgedTasks.length > 0
    ? Math.round(
        acknowledgedTasks.reduce((sum, t) => {
          const hrs = (t.acknowledgedAt!.getTime() - t.createdAt.getTime()) / 3_600_000
          return sum + hrs
        }, 0) / acknowledgedTasks.length
      )
    : null

  const metrics = {
    overdueCount: overdue.length,
    unacknowledgedCount: unacknowledged.length,
    completionRate,
    avgResponseHours,
    totalOpen: allTasks.filter(t => t.status !== 'completed').length,
  }

  const propertyOptions = properties.map(p => ({ id: p.id, addressLine1: p.addressLine1 }))

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">PM Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage property manager assignments</p>
        </div>
        <TasksTable tasks={serialized} metrics={metrics} properties={propertyOptions} />
      </div>
    </AppShell>
  )
}
