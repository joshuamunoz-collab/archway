'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, AlertCircle, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high:   'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low:    'bg-secondary text-muted-foreground border-border',
}

const STATUS_COLORS: Record<string, string> = {
  created:         'bg-secondary text-muted-foreground border-border',
  sent_to_pm:      'bg-blue-50 text-blue-700 border-blue-200',
  pm_acknowledged: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress:     'bg-amber-50 text-amber-700 border-amber-200',
  completed:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue:         'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  created:         'Created',
  sent_to_pm:      'Sent to PM',
  pm_acknowledged: 'Acknowledged',
  in_progress:     'In Progress',
  completed:       'Completed',
  overdue:         'Overdue',
}

const TASK_TYPE_LABELS: Record<string, string> = {
  city_notice_response: 'City Notice Response',
  maintenance:          'Maintenance',
  inspection_prep:      'Inspection Prep',
  rehab:                'Rehab',
  general:              'General',
}

const STATUS_TABS = [
  { key: 'all',        label: 'All' },
  { key: 'open',       label: 'Open' },
  { key: 'overdue',    label: 'Overdue' },
  { key: 'completed',  label: 'Completed' },
]

interface TaskRow {
  id: string
  propertyId: string | null
  property: { id: string; addressLine1: string } | null
  cityNoticeId: string | null
  taskType: string
  priority: string
  title: string
  description: string | null
  assignedTo: string | null
  dueDate: string | null
  acknowledgedAt: string | null
  completedAt: string | null
  status: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

interface Metrics {
  overdueCount: number
  unacknowledgedCount: number
  completionRate: number
  avgResponseHours: number | null
  totalOpen: number
}

interface PropertyOption {
  id: string
  addressLine1: string
}

const EMPTY_FORM = {
  propertyId: '',
  taskType: 'general',
  priority: 'medium',
  title: '',
  description: '',
  assignedTo: '',
  dueDate: '',
}

export function TasksTable({
  tasks,
  metrics,
  properties,
}: {
  tasks: TaskRow[]
  metrics: Metrics
  properties: PropertyOption[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState('open')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const now = new Date()

  const filtered = tasks.filter(t => {
    if (tab === 'open') {
      const isOverdue = t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now
      return t.status !== 'completed' && !isOverdue
    }
    if (tab === 'overdue') {
      return t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now
    }
    if (tab === 'completed') return t.status === 'completed'
    return true // all
  }).filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      t.property?.addressLine1.toLowerCase().includes(q) ||
      t.assignedTo?.toLowerCase().includes(q) ||
      TASK_TYPE_LABELS[t.taskType]?.toLowerCase().includes(q)
    )
  })

  async function createTask() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: form.propertyId || null,
          taskType: form.taskType,
          priority: form.priority,
          title: form.title.trim(),
          description: form.description.trim() || null,
          assignedTo: form.assignedTo.trim() || null,
          dueDate: form.dueDate || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Task created')
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  function isOverdue(t: TaskRow) {
    return t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now
  }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={metrics.overdueCount > 0 ? 'border-red-200' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className={cn('h-4 w-4', metrics.overdueCount > 0 ? 'text-red-500' : 'text-muted-foreground')} />
              <p className="text-xs text-muted-foreground font-medium">Overdue Tasks</p>
            </div>
            <p className={cn('text-2xl font-bold', metrics.overdueCount > 0 ? 'text-red-600' : 'text-foreground')}>
              {metrics.overdueCount}
            </p>
          </CardContent>
        </Card>
        <Card className={metrics.unacknowledgedCount > 0 ? 'border-amber-200' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className={cn('h-4 w-4', metrics.unacknowledgedCount > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
              <p className="text-xs text-muted-foreground font-medium">Unacknowledged &gt;48h</p>
            </div>
            <p className={cn('text-2xl font-bold', metrics.unacknowledgedCount > 0 ? 'text-amber-600' : 'text-foreground')}>
              {metrics.unacknowledgedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">Completion Rate</p>
            </div>
            <p className="text-2xl font-bold">{metrics.completionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">Avg Response Time</p>
            </div>
            <p className="text-2xl font-bold">
              {metrics.avgResponseHours != null
                ? metrics.avgResponseHours < 24
                  ? `${metrics.avgResponseHours}h`
                  : `${Math.round(metrics.avgResponseHours / 24)}d`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Status tabs */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden bg-secondary/30">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-1.5 text-sm transition-colors',
                tab === t.key
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm w-full sm:w-56"
          />
          <Button
            size="sm"
            className="gap-1 h-8 shrink-0"
            onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}
          >
            <Plus className="h-3.5 w-3.5" /> New Task
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No tasks found.</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1 text-xs" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}>
                <Plus className="h-3.5 w-3.5" /> Create Task
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Task</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Property</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Priority</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {tasks.length === 0 ? 'No tasks yet. Create your first task above.' : 'No tasks match your filters.'}
                    </td>
                  </tr>
                )}
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <Link href={`/tasks/${t.id}`} className="hover:underline font-medium text-foreground">
                        {t.title}
                      </Link>
                      {t.assignedTo && (
                        <p className="text-xs text-muted-foreground mt-0.5">{t.assignedTo}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {t.property ? (
                        <Link href={`/properties/${t.property.id}?tab=city`} className="hover:underline">
                          {t.property.addressLine1}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {TASK_TYPE_LABELS[t.taskType] ?? t.taskType}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        PRIORITY_COLORS[t.priority] ?? 'bg-secondary text-foreground border-border'
                      )}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        isOverdue(t)
                          ? STATUS_COLORS.overdue
                          : STATUS_COLORS[t.status] ?? 'bg-secondary text-foreground border-border'
                      )}>
                        {isOverdue(t) ? 'Overdue' : (STATUS_LABELS[t.status] ?? t.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {t.dueDate ? (
                        <span className={cn(
                          'text-sm',
                          isOverdue(t) ? 'text-red-600 font-medium' : 'text-muted-foreground'
                        )}>
                          {formatDate(t.dueDate)}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create Task Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>New Task</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Property</Label>
              <Select value={form.propertyId} onValueChange={v => setForm(f => ({ ...f, propertyId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select property…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No property</SelectItem>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.addressLine1}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Task Type *</Label>
                <Select value={form.taskType} onValueChange={v => setForm(f => ({ ...f, taskType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Assigned To</Label>
              <Input
                value={form.assignedTo}
                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                placeholder="PM name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Task details…"
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createTask} disabled={saving}>{saving ? 'Saving…' : 'Create Task'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
