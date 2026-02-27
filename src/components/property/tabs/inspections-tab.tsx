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
import { formatDate, daysFromNow } from '@/lib/format'
import type { PropertyDetailData, InspectionData } from '@/types/property'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  initial_hqs:   'Initial HQS',
  annual_hqs:    'Annual HQS',
  reinspection:  'Re-inspection',
  city_code:     'City/Code',
}

const RESULT_COLORS: Record<string, string> = {
  pass:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  fail:    'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
}

const EMPTY_FORM = {
  inspectionType: 'annual_hqs',
  scheduledDate: '',
  completedDate: '',
  inspector: '',
  result: '',
  deficiencies: '',
  reinspectionDeadline: '',
  notes: '',
}

export function InspectionsTab({ data }: { data: PropertyDetailData }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function addInspection() {
    if (!form.inspectionType) { toast.error('Inspection type is required'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/properties/${data.id}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Inspection added')
      setOpen(false)
      setForm(EMPTY_FORM)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function updateResult(inspectionId: string, result: string) {
    const res = await fetch(`/api/properties/${data.id}/inspections/${inspectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, completedDate: new Date().toISOString().split('T')[0] }),
    })
    if (!res.ok) { toast.error('Failed to update'); return }
    toast.success('Result recorded')
    router.refresh()
  }

  async function deleteInspection(inspectionId: string) {
    if (!confirm('Delete this inspection record?')) return
    const res = await fetch(`/api/properties/${data.id}/inspections/${inspectionId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success('Deleted')
    router.refresh()
  }

  const inspections = (data as PropertyDetailData & { inspections?: InspectionData[] }).inspections ?? []
  const upcoming = inspections.filter(i => !i.completedDate && i.scheduledDate)
  const completed = inspections.filter(i => i.completedDate || !i.scheduledDate)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Inspections</CardTitle>
          <Button size="sm" variant="outline" onClick={() => { setForm(EMPTY_FORM); setOpen(true) }} className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Inspection
          </Button>
        </CardHeader>
        <CardContent>
          {inspections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No inspections recorded.</p>
          ) : (
            <div className="space-y-2">
              {/* Upcoming */}
              {upcoming.map(i => <InspectionCard key={i.id} inspection={i} expanded={expanded === i.id} onToggle={() => setExpanded(expanded === i.id ? null : i.id)} onUpdateResult={result => updateResult(i.id, result)} onDelete={() => deleteInspection(i.id)} />)}
              {/* Completed */}
              {completed.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground py-2 select-none list-none flex items-center gap-1">
                    <ChevronDown className="h-3.5 w-3.5 group-open:rotate-180 transition-transform" />
                    {completed.length} completed inspection{completed.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="space-y-2 mt-2">
                    {completed.map(i => <InspectionCard key={i.id} inspection={i} expanded={expanded === i.id} onToggle={() => setExpanded(expanded === i.id ? null : i.id)} onUpdateResult={result => updateResult(i.id, result)} onDelete={() => deleteInspection(i.id)} />)}
                  </div>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Inspection Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Inspection</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Inspection Type *</Label>
              <Select value={form.inspectionType} onValueChange={v => setForm(f => ({ ...f, inspectionType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Scheduled Date</Label>
                <Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Completed Date</Label>
                <Input type="date" value={form.completedDate} onChange={e => setForm(f => ({ ...f, completedDate: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Inspector</Label>
              <Input value={form.inspector} onChange={e => setForm(f => ({ ...f, inspector: e.target.value }))} placeholder="Inspector name" className="mt-1" />
            </div>
            <div>
              <Label>Result</Label>
              <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select result…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Pending</SelectItem>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.result === 'fail' && (
              <>
                <div>
                  <Label>Deficiencies</Label>
                  <textarea
                    value={form.deficiencies}
                    onChange={e => setForm(f => ({ ...f, deficiencies: e.target.value }))}
                    placeholder="List deficiencies…"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <Label>Re-inspection Deadline</Label>
                  <Input type="date" value={form.reinspectionDeadline} onChange={e => setForm(f => ({ ...f, reinspectionDeadline: e.target.value }))} className="mt-1" />
                </div>
              </>
            )}
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" className="mt-1" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addInspection} disabled={saving}>{saving ? 'Saving…' : 'Add Inspection'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function InspectionCard({
  inspection,
  expanded,
  onToggle,
  onUpdateResult,
  onDelete,
}: {
  inspection: InspectionData
  expanded: boolean
  onToggle: () => void
  onUpdateResult: (result: string) => void
  onDelete: () => void
}) {
  const daysUntil = inspection.scheduledDate ? daysFromNow(inspection.scheduledDate) : null

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-secondary/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{TYPE_LABELS[inspection.inspectionType] ?? inspection.inspectionType}</span>
            {inspection.result ? (
              <span className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                RESULT_COLORS[inspection.result] ?? 'bg-secondary text-foreground border-border'
              )}>
                {inspection.result}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border bg-amber-50 text-amber-700 border-amber-200 px-2 py-0.5 text-xs font-medium">pending</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {inspection.scheduledDate && (
              <span>
                Scheduled {formatDate(inspection.scheduledDate)}
                {daysUntil != null && !inspection.completedDate && (
                  <span className={cn(daysUntil < 7 ? 'text-orange-600 font-medium' : '')}>
                    {daysUntil < 0 ? ` (${Math.abs(daysUntil)}d overdue)` : ` (in ${daysUntil}d)`}
                  </span>
                )}
              </span>
            )}
            {inspection.completedDate && ` · Completed ${formatDate(inspection.completedDate)}`}
            {inspection.inspector && ` · ${inspection.inspector}`}
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="border-t bg-secondary/20 p-3 space-y-3">
          {inspection.deficiencies && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Deficiencies</p>
              <p className="text-sm whitespace-pre-wrap">{inspection.deficiencies}</p>
            </div>
          )}
          {inspection.reinspectionDeadline && (
            <p className="text-xs text-muted-foreground">
              Re-inspection deadline: <span className="font-medium">{formatDate(inspection.reinspectionDeadline)}</span>
            </p>
          )}
          {inspection.notes && <p className="text-xs text-muted-foreground">{inspection.notes}</p>}
          <div className="flex items-center gap-3">
            {!inspection.result && (
              <>
                <button className="text-xs text-emerald-600 hover:underline" onClick={() => onUpdateResult('pass')}>Mark Pass</button>
                <button className="text-xs text-red-600 hover:underline" onClick={() => onUpdateResult('fail')}>Mark Fail</button>
              </>
            )}
            <button className="text-xs text-destructive hover:underline ml-auto" onClick={onDelete}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
