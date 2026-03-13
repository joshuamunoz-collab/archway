'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Pencil, AlertCircle, Clock, CheckCircle2, TrendingUp, Send } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { formatDate, formatDateTime } from '@/lib/format'
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
  pending:         'bg-purple-50 text-purple-700 border-purple-200',
}

const STATUS_LABELS: Record<string, string> = {
  created:         'Open',
  sent_to_pm:      'Sent to PM',
  pm_acknowledged: 'Acknowledged',
  in_progress:     'In Progress',
  completed:       'Completed',
  overdue:         'Overdue',
  pending:         'Pending',
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
  { key: 'pending',    label: 'Pending' },
  { key: 'overdue',    label: 'Overdue' },
  { key: 'completed',  label: 'Completed' },
]

const FORM_STATUS_OPTIONS = [
  { value: 'created',     label: 'Open' },
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
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

interface UserOption {
  id: string
  fullName: string
}

interface TaskNote {
  id: string
  message: string
  createdAt: string
  user: { id: string; fullName: string }
}

const EMPTY_FORM = {
  propertyId: '',
  taskType: 'general',
  priority: 'medium',
  status: 'created',
  title: '',
  description: '',
  assignedTo: '',
  dueDate: '',
}

export function TasksTable({
  tasks,
  metrics,
  properties,
  users,
}: {
  tasks: TaskRow[]
  metrics: Metrics
  properties: PropertyOption[]
  users: UserOption[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState('open')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Notes state for edit sheet
  const [notes, setNotes] = useState<TaskNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const now = new Date()

  const filtered = tasks.filter(t => {
    if (tab === 'open') {
      const isOd = t.status !== 'completed' && t.status !== 'pending' && t.dueDate && new Date(t.dueDate) < now
      return t.status !== 'completed' && t.status !== 'pending' && !isOd
    }
    if (tab === 'pending') return t.status === 'pending'
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

  function openEditSheet(task: TaskRow) {
    setEditingTask(task)
    setForm({
      propertyId: task.propertyId || '',
      taskType: task.taskType,
      priority: task.priority,
      status: task.status,
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo || '',
      dueDate: task.dueDate || '',
    })
    setNewNote('')
    setEditOpen(true)
  }

  // Fetch notes when edit sheet opens
  useEffect(() => {
    if (!editOpen || !editingTask) {
      setNotes([])
      return
    }
    setNotesLoading(true)
    fetch(`/api/tasks/${editingTask.id}`)
      .then(r => r.json())
      .then(data => {
        setNotes(
          (data.messages || []).map((m: { id: string; message: string; createdAt: string; user: { id: string; fullName: string } }) => ({
            id: m.id,
            message: m.message,
            createdAt: m.createdAt,
            user: m.user,
          }))
        )
      })
      .catch(() => setNotes([]))
      .finally(() => setNotesLoading(false))
  }, [editOpen, editingTask])

  async function createTask() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.propertyId) { toast.error('Property is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: form.propertyId,
          taskType: form.taskType,
          priority: form.priority,
          status: form.status,
          title: form.title.trim(),
          description: form.description.trim() || null,
          assignedTo: form.assignedTo || null,
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

  async function updateTask() {
    if (!editingTask) return
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.propertyId) { toast.error('Property is required'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: form.propertyId,
          taskType: form.taskType,
          priority: form.priority,
          status: form.status,
          title: form.title.trim(),
          description: form.description.trim() || null,
          assignedTo: form.assignedTo || null,
          dueDate: form.dueDate || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Task updated')
      setEditOpen(false)
      setEditingTask(null)
      setForm(EMPTY_FORM)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  async function addNote() {
    if (!editingTask || !newNote.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newNote.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const note = await res.json()
      setNotes(prev => [...prev, {
        id: note.id,
        message: note.message,
        createdAt: note.createdAt,
        user: note.user,
      }])
      setNewNote('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  function isOverdue(t: TaskRow) {
    return t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now
  }

  // Shared form fields used by both Create and Edit sheets
  function renderFormFields() {
    return (
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
          <Label>Property *</Label>
          <Select
            value={form.propertyId || undefined}
            onValueChange={v => setForm(f => ({ ...f, propertyId: v }))}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select property..." /></SelectTrigger>
            <SelectContent>
              {properties.filter(p => p.id).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.addressLine1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.taskType} onValueChange={v => setForm(f => ({ ...f, taskType: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORM_STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
          <Select
            value={form.assignedTo || undefined}
            onValueChange={v => setForm(f => ({ ...f, assignedTo: v === '__none__' ? '' : v }))}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select team member..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {users.filter(u => u.id && u.fullName).map(u => (
                <SelectItem key={u.id} value={u.fullName}>{u.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Description</Label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Task details..."
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    )
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
            placeholder="Search tasks..."
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
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Property</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Due</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(t => (
                  <tr key={t.id} className="group hover:bg-gray-50 transition-colors">
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
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditSheet(t) }}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-gray-100 transition-all"
                        title="Edit task"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
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
          {renderFormFields()}
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createTask} disabled={saving}>{saving ? 'Saving...' : 'Create Task'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Task Sheet */}
      <Sheet open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingTask(null) }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Edit Task</SheetTitle></SheetHeader>
          {renderFormFields()}

          {/* Notes Section */}
          <Separator className="my-2" />
          <div className="space-y-3 py-3">
            <Label className="text-sm font-semibold">Notes</Label>

            {/* Add note input */}
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    addNote()
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="self-end h-8 px-2"
                onClick={addNote}
                disabled={addingNote || !newNote.trim()}
                title="Add note (Ctrl+Enter)"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Notes timeline */}
            {notesLoading ? (
              <p className="text-xs text-muted-foreground">Loading notes...</p>
            ) : notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {notes.map(note => (
                  <div key={note.id} className="border-l-2 border-gray-200 pl-3 py-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{note.user.fullName}</span>
                      <span>&middot;</span>
                      <span>{formatDateTime(note.createdAt)}</span>
                    </div>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{note.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SheetFooter className="mt-2">
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditingTask(null) }}>Cancel</Button>
            <Button onClick={updateTask} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
