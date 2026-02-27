'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { PropertyDetailData, CityNoticeData } from '@/types/property'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  open:             'bg-red-50 text-red-700 border-red-200',
  overdue:          'bg-red-50 text-red-700 border-red-200',
  sent_to_pm:       'bg-amber-50 text-amber-700 border-amber-200',
  pm_acknowledged:  'bg-blue-50 text-blue-700 border-blue-200',
  in_progress:      'bg-blue-50 text-blue-700 border-blue-200',
  resolved:         'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const STATUS_LABELS: Record<string, string> = {
  open:             'Open',
  overdue:          'Overdue',
  sent_to_pm:       'Sent to PM',
  pm_acknowledged:  'PM Acknowledged',
  in_progress:      'In Progress',
  resolved:         'Resolved',
}

const EMPTY_FORM = {
  dateReceived: new Date().toISOString().split('T')[0],
  noticeType: '',
  description: '',
  deadline: '',
  assignedTo: '',
}

export function CityTab({ data }: { data: PropertyDetailData }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function addNotice() {
    if (!form.description.trim()) { toast.error('Description is required'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/properties/${data.id}/city-notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('City notice added')
      setOpen(false)
      setForm(EMPTY_FORM)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(noticeId: string, status: string) {
    const res = await fetch(`/api/properties/${data.id}/city-notices/${noticeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error('Failed to update'); return }
    toast.success('Status updated')
    router.refresh()
  }

  async function deleteNotice(noticeId: string) {
    if (!confirm('Delete this city notice?')) return
    const res = await fetch(`/api/properties/${data.id}/city-notices/${noticeId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success('Notice deleted')
    router.refresh()
  }

  const open_notices = data.cityNotices.filter(n => n.status !== 'resolved')
  const resolved_notices = data.cityNotices.filter(n => n.status === 'resolved')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">City &amp; Compliance Notices</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Notice
          </Button>
        </CardHeader>
        <CardContent>
          {data.cityNotices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No city notices on file.</p>
          ) : (
            <div className="space-y-2">
              {open_notices.map(notice => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  expanded={expanded === notice.id}
                  onToggle={() => setExpanded(expanded === notice.id ? null : notice.id)}
                  onStatusChange={status => updateStatus(notice.id, status)}
                  onDelete={() => deleteNotice(notice.id)}
                />
              ))}
              {resolved_notices.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground py-2 select-none list-none flex items-center gap-1">
                    <ChevronDown className="h-3.5 w-3.5 group-open:rotate-180 transition-transform" />
                    {resolved_notices.length} resolved notice{resolved_notices.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="space-y-2 mt-2">
                    {resolved_notices.map(notice => (
                      <NoticeCard
                        key={notice.id}
                        notice={notice}
                        expanded={expanded === notice.id}
                        onToggle={() => setExpanded(expanded === notice.id ? null : notice.id)}
                        onStatusChange={status => updateStatus(notice.id, status)}
                        onDelete={() => deleteNotice(notice.id)}
                      />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Notice Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add City Notice</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date Received *</Label>
                <Input
                  type="date"
                  value={form.dateReceived}
                  onChange={e => setForm(f => ({ ...f, dateReceived: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Notice Type</Label>
              <Input
                value={form.noticeType}
                onChange={e => setForm(f => ({ ...f, noticeType: e.target.value }))}
                placeholder="e.g. Code Violation, Building Inspection"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the notice or violation"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Assigned To</Label>
              <Input
                value={form.assignedTo}
                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                placeholder="Property Manager name"
                className="mt-1"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addNotice} disabled={saving}>
              {saving ? 'Saving…' : 'Add Notice'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function NoticeCard({
  notice,
  expanded,
  onToggle,
  onStatusChange,
  onDelete,
}: {
  notice: CityNoticeData
  expanded: boolean
  onToggle: () => void
  onStatusChange: (status: string) => void
  onDelete: () => void
}) {
  const daysSince = Math.floor(
    (Date.now() - new Date(notice.dateReceived).getTime()) / 86_400_000
  )
  const daysUntilDeadline = notice.deadline
    ? Math.ceil((new Date(notice.deadline).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-secondary/30 transition-colors"
        onClick={onToggle}
      >
        <span className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 mt-0.5',
          STATUS_COLORS[notice.status] ?? 'bg-secondary text-foreground border-border'
        )}>
          {STATUS_LABELS[notice.status] ?? notice.status}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{notice.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {notice.noticeType && <span>{notice.noticeType} · </span>}
            Received {formatDate(notice.dateReceived)}
            {daysUntilDeadline !== null && (
              <span className={cn(
                ' · ',
                daysUntilDeadline < 0 ? 'text-red-600 font-medium' :
                daysUntilDeadline <= 7 ? 'text-orange-600 font-medium' : ''
              )}>
                Due {formatDate(notice.deadline)}
                {daysUntilDeadline < 0 && ` (${Math.abs(daysUntilDeadline)}d overdue)`}
              </span>
            )}
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="border-t bg-secondary/20 p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">{daysSince}d since received</span>
            {notice.assignedTo && (
              <span className="text-xs text-muted-foreground">· Assigned: {notice.assignedTo}</span>
            )}
          </div>
          {notice.resolutionNotes && (
            <p className="text-xs text-muted-foreground">{notice.resolutionNotes}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Move to:</span>
            {['sent_to_pm', 'pm_acknowledged', 'in_progress', 'resolved'].map(s => (
              notice.status !== s && (
                <button
                  key={s}
                  className="text-xs underline text-foreground hover:text-primary"
                  onClick={() => onStatusChange(s)}
                >
                  {STATUS_LABELS[s]}
                </button>
              )
            ))}
            <button
              className="text-xs text-destructive hover:underline ml-auto"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
