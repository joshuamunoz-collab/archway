'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ListTodo, StickyNote, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { formatDate } from '@/lib/format'
import type { PropertyDetailData, QuickNoteData } from '@/types/property'

const CATEGORY_STYLES: Record<string, { label: string; className: string }> = {
  maintenance:      { label: '🔧 Maintenance',  className: 'bg-orange-100 text-orange-700' },
  vacancy:          { label: '🏠 Vacancy',      className: 'bg-purple-100 text-purple-700' },
  insurance:        { label: '🛡️ Insurance',    className: 'bg-cyan-100 text-cyan-700' },
  financial:        { label: '💰 Financial',     className: 'bg-emerald-100 text-emerald-700' },
  property_manager: { label: '👷 PM',           className: 'bg-amber-100 text-amber-700' },
  general:          { label: '📋 General',       className: 'bg-gray-100 text-gray-600' },
}

const TASK_TYPE_LABELS: Record<string, string> = {
  city_notice_response: 'City Notice Response',
  maintenance:          'Maintenance',
  inspection_prep:      'Inspection Prep',
  rehab:                'Rehab',
  general:              'General',
}

const FORM_STATUS_OPTIONS = [
  { value: 'created',     label: 'Open' },
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
]

interface UserOption {
  id: string
  fullName: string
}

function highlightMentions(content: string, mentionedProperties: QuickNoteData['mentionedProperties']) {
  if (mentionedProperties.length === 0) return <span>{content}</span>

  const escaped = mentionedProperties.map(p =>
    p.mentionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  )
  const re = new RegExp(`(@(?:${escaped.join('|')}))`, 'g')
  const parts = content.split(re)

  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="bg-blue-100 text-blue-700 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

const EMPTY_TASK_FORM = {
  taskType: 'general',
  priority: 'medium',
  status: 'created',
  title: '',
  description: '',
  assignedTo: '',
  dueDate: '',
}

export function NotesTab({ data, users }: { data: PropertyDetailData; users: UserOption[] }) {
  const router = useRouter()
  const { quickNotes } = data

  const [createOpen, setCreateOpen] = useState(false)
  const [sourceNoteId, setSourceNoteId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_TASK_FORM)
  const [saving, setSaving] = useState(false)
  // Track locally-linked taskIds so UI updates without full page refresh
  const [linkedTasks, setLinkedTasks] = useState<Record<string, string>>({})

  function stripMentions(text: string, mentions: QuickNoteData['mentionedProperties']): string {
    let result = text
    for (const m of mentions) {
      result = result.replace(new RegExp(`@${m.mentionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g'), '')
    }
    return result.trim()
  }

  function getTomorrowDate(): string {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  function openCreateTaskFromNote(note: QuickNoteData) {
    setSourceNoteId(note.id)
    const taskTypeMap: Record<string, string> = {
      maintenance: 'maintenance',
      vacancy: 'general',
      insurance: 'general',
      financial: 'general',
      property_manager: 'general',
      general: 'general',
    }
    const stripped = stripMentions(note.content, note.mentionedProperties)
    setForm({
      ...EMPTY_TASK_FORM,
      taskType: taskTypeMap[note.category] || 'general',
      title: stripped.length > 80 ? stripped.slice(0, 80) + '...' : stripped,
      description: note.content,
      dueDate: getTomorrowDate(),
    })
    setCreateOpen(true)
  }

  async function createTask() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: data.id,
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
      const task = await res.json()

      // Link the note to the task
      if (sourceNoteId) {
        await fetch(`/api/notes/${sourceNoteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id }),
        })
        setLinkedTasks(prev => ({ ...prev, [sourceNoteId]: task.id }))
      }

      toast.success('Task created successfully')
      setCreateOpen(false)
      setSourceNoteId(null)
      setForm(EMPTY_TASK_FORM)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  if (quickNotes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <StickyNote className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No notes linked to this property.</p>
          <p className="text-xs text-gray-400 mt-1">
            Create a note with @{data.addressLine1} to link it here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {quickNotes.map(note => {
          const style = CATEGORY_STYLES[note.category] ?? CATEGORY_STYLES.general
          const existingTaskId = linkedTasks[note.id] || note.taskId
          return (
            <Card key={note.id}>
              <CardContent className="pt-4 pb-3 space-y-2">
                {/* Header: author + category + timestamp */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{note.authorName}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>
                      {style.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(note.createdAt)}
                  </span>
                </div>

                {/* Content with highlighted mentions */}
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {highlightMentions(note.content, note.mentionedProperties)}
                </p>

                {/* Footer: Create Task or View Task */}
                <div className="flex justify-end pt-1">
                  {existingTaskId ? (
                    <Link href={`/tasks/${existingTaskId}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Task
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => openCreateTaskFromNote(note)}
                    >
                      <ListTodo className="h-3.5 w-3.5" />
                      Create Task
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Task Sheet */}
      <Sheet open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setSourceNoteId(null) }}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader><SheetTitle>Create Task from Note</SheetTitle></SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
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
              <Input
                value={data.addressLine1}
                disabled
                className="mt-1 bg-gray-50"
              />
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
                rows={4}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <SheetFooter className="border-t border-border pt-4 flex-row gap-3 justify-end">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setSourceNoteId(null) }}>Cancel</Button>
            <Button onClick={createTask} disabled={saving}>
              {saving ? 'Creating...' : 'Create Task'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
