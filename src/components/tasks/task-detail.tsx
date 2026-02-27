'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Building2, Calendar, User, MessageSquare, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
}

const STATUS_LABELS: Record<string, string> = {
  created:         'Created',
  sent_to_pm:      'Sent to PM',
  pm_acknowledged: 'PM Acknowledged',
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

interface TaskMessage {
  id: string
  userId: string
  user: { id: string; fullName: string }
  message: string
  createdAt: string
}

interface TaskData {
  id: string
  propertyId: string | null
  property: { id: string; addressLine1: string; addressLine2: string | null } | null
  cityNotice: { id: string; noticeType: string | null; description: string } | null
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
  messages: TaskMessage[]
}

export function TaskDetail({ task }: { task: TaskData }) {
  const router = useRouter()
  const [status, setStatus] = useState(task.status)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messages, setMessages] = useState(task.messages)

  const now = new Date()
  const isOverdue = status !== 'completed' && task.dueDate && new Date(task.dueDate) < now

  async function updateStatus(newStatus: string) {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setStatus(newStatus)
      toast.success('Status updated')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim()) return
    setSendingMessage(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const msg = await res.json()
      setMessages(prev => [...prev, {
        id: msg.id,
        userId: msg.userId,
        user: msg.user,
        message: msg.message,
        createdAt: msg.createdAt,
      }])
      setNewMessage('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  async function deleteTask() {
    if (!confirm('Delete this task? This cannot be undone.')) return
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete task'); return }
    toast.success('Task deleted')
    router.push('/tasks')
  }

  const displayStatus = isOverdue ? 'overdue' : status

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Back nav */}
      <div>
        <Link href="/tasks" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 justify-between flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{task.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
              STATUS_COLORS[displayStatus] ?? 'bg-secondary text-foreground border-border'
            )}>
              {STATUS_LABELS[displayStatus] ?? displayStatus}
            </span>
            <span className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
              PRIORITY_COLORS[task.priority] ?? 'bg-secondary text-foreground border-border'
            )}>
              {task.priority} priority
            </span>
            <span className="text-xs text-muted-foreground">
              {TASK_TYPE_LABELS[task.taskType] ?? task.taskType}
            </span>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={deleteTask}
        >
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {task.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
              </CardContent>
            </Card>
          )}

          {/* City notice link */}
          {task.cityNotice && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Linked City Notice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{task.cityNotice.noticeType && <span className="font-medium">{task.cityNotice.noticeType}: </span>}{task.cityNotice.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Message thread */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Notes &amp; Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">No notes yet. Add a note below.</p>
              )}
              {messages.map(m => (
                <div key={m.id} className="rounded-lg bg-secondary/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">{m.user.fullName}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                </div>
              ))}

              {/* Add message */}
              <div className="pt-2 border-t border-border">
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendMessage()
                  }}
                  placeholder="Add a note… (Ctrl+Enter to send)"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={sendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sendingMessage ? 'Sending…' : 'Send'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={status} onValueChange={updateStatus} disabled={updatingStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="sent_to_pm">Sent to PM</SelectItem>
                  <SelectItem value="pm_acknowledged">PM Acknowledged</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {status !== 'completed' && (
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus('completed')}
                  disabled={updatingStatus}
                >
                  Mark Complete
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {task.property && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Property</p>
                    <Link href={`/properties/${task.property.id}`} className="hover:underline font-medium">
                      {task.property.addressLine1}
                    </Link>
                  </div>
                </div>
              )}
              {task.assignedTo && (
                <div className="flex items-start gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned to</p>
                    <p className="font-medium">{task.assignedTo}</p>
                  </div>
                </div>
              )}
              {task.dueDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Due date</p>
                    <p className={cn('font-medium', isOverdue ? 'text-red-600' : '')}>
                      {formatDate(task.dueDate)}
                      {isOverdue && ' (overdue)'}
                    </p>
                  </div>
                </div>
              )}
              {task.acknowledgedAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Acknowledged</p>
                  <p className="text-xs">{formatDateTime(task.acknowledgedAt)}</p>
                </div>
              )}
              {task.completedAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-xs">{formatDateTime(task.completedAt)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-xs">{formatDateTime(task.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
