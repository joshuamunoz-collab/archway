'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  not_started:      'bg-secondary text-muted-foreground border-border',
  in_progress:      'bg-blue-50 text-blue-700 border-blue-200',
  on_hold:          'bg-amber-50 text-amber-700 border-amber-200',
  completed:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  over_budget:      'bg-red-50 text-red-700 border-red-200',
  behind_schedule:  'bg-orange-50 text-orange-700 border-orange-200',
}

const STATUS_LABELS: Record<string, string> = {
  not_started:      'Not Started',
  in_progress:      'In Progress',
  on_hold:          'On Hold',
  completed:        'Completed',
  over_budget:      'Over Budget',
  behind_schedule:  'Behind Schedule',
}

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  pending:     'bg-secondary text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-emerald-100 text-emerald-700',
  skipped:     'bg-secondary text-muted-foreground line-through',
}

interface RehabMilestone {
  id: string
  name: string
  sortOrder: number | null
  targetDate: string | null
  actualDate: string | null
  status: string
  notes: string | null
}

interface RehabRow {
  id: string
  propertyId: string
  property: { id: string; addressLine1: string; entityName: string }
  scope: string | null
  startDate: string | null
  targetEndDate: string | null
  actualEndDate: string | null
  originalEstimate: number | null
  currentEstimate: number | null
  actualCost: number
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  milestones: RehabMilestone[]
}

const EMPTY_FORM = {
  propertyId: '',
  scope: '',
  startDate: '',
  targetEndDate: '',
  originalEstimate: '',
}

const DEFAULT_MILESTONES = [
  'Demo', 'Rough Plumbing', 'Rough Electrical', 'Drywall', 'Paint',
  'Flooring', 'Fixtures', 'Final Clean',
]

export function RehabList({
  rehabs,
  properties,
}: {
  rehabs: RehabRow[]
  properties: { id: string; addressLine1: string }[]
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('active')

  const filtered = rehabs.filter(r => {
    if (statusFilter === 'active') return !['completed'].includes(r.status)
    if (statusFilter === 'completed') return r.status === 'completed'
    return true
  })

  async function createRehab() {
    if (!form.propertyId) { toast.error('Property is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/rehabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: form.propertyId,
          scope: form.scope || null,
          startDate: form.startDate || null,
          targetEndDate: form.targetEndDate || null,
          originalEstimate: form.originalEstimate ? parseFloat(form.originalEstimate) : null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const rehab = await res.json()

      // Auto-create default milestones
      for (let i = 0; i < DEFAULT_MILESTONES.length; i++) {
        await fetch(`/api/rehabs/${rehab.id}/milestones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: DEFAULT_MILESTONES[i] }),
        })
      }

      toast.success('Rehab project created')
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create rehab')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(rehabId: string, status: string) {
    const res = await fetch(`/api/rehabs/${rehabId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error('Failed to update'); return }
    toast.success('Status updated')
    router.refresh()
  }

  async function updateMilestone(rehabId: string, milestoneId: string, update: Record<string, string>) {
    const res = await fetch(`/api/rehabs/${rehabId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    if (!res.ok) { toast.error('Failed to update milestone'); return }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center border border-border rounded-lg overflow-hidden bg-secondary/30">
          {[
            { key: 'active', label: 'Active' },
            { key: 'all', label: 'All' },
            { key: 'completed', label: 'Completed' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={cn(
                'px-3 py-1.5 text-sm transition-colors',
                statusFilter === t.key
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="gap-1"
          onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}
        >
          <Plus className="h-3.5 w-3.5" /> New Project
        </Button>
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No rehab projects.</p>
            <Button size="sm" variant="outline" className="mt-3 gap-1 text-xs" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}>
              <Plus className="h-3.5 w-3.5" /> Start a Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const estimate = r.currentEstimate ?? r.originalEstimate
            const variance = estimate != null ? r.actualCost - estimate : null
            const completedMilestones = r.milestones.filter(m => m.status === 'completed').length
            const pct = r.milestones.length > 0
              ? Math.round((completedMilestones / r.milestones.length) * 100)
              : 0

            return (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3 justify-between flex-wrap">
                    <div className="flex-1 min-w-0">
                      <Link href={`/properties/${r.property.id}`} className="font-semibold hover:underline text-foreground">
                        {r.property.addressLine1}
                      </Link>
                      <p className="text-xs text-muted-foreground">{r.property.entityName}</p>
                      {r.scope && <p className="text-sm text-muted-foreground mt-0.5">{r.scope}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        STATUS_COLORS[r.status] ?? 'bg-secondary text-foreground border-border'
                      )}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress bar */}
                  {r.milestones.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{completedMilestones}/{r.milestones.length} milestones</span>
                        <span className="text-xs font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Budget / timeline summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Estimate</p>
                      <p className="font-medium">{estimate != null ? formatCurrency(estimate) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Actual Cost</p>
                      <p className="font-medium">{formatCurrency(r.actualCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Variance</p>
                      <p className={cn('font-medium', variance != null && variance > 0 ? 'text-red-600' : 'text-emerald-600')}>
                        {variance != null ? (variance >= 0 ? '+' : '') + formatCurrency(variance) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Target End</p>
                      <p className="font-medium">{r.targetEndDate ? formatDate(r.targetEndDate) : '—'}</p>
                    </div>
                  </div>

                  {/* Status actions + milestones toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Move to:</span>
                      {['in_progress', 'on_hold', 'completed'].map(s =>
                        r.status !== s && (
                          <button
                            key={s}
                            onClick={() => updateStatus(r.id, s)}
                            className="text-xs underline text-foreground hover:text-primary"
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        )
                      )}
                    </div>
                    <button
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {expanded === r.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      Milestones
                    </button>
                  </div>

                  {/* Milestone detail */}
                  {expanded === r.id && (
                    <div className="border-t pt-3 space-y-2">
                      {r.milestones.map(m => (
                        <div key={m.id} className="flex items-center gap-3 text-sm">
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0',
                            MILESTONE_STATUS_COLORS[m.status] ?? 'bg-secondary text-muted-foreground'
                          )}>
                            {m.status}
                          </span>
                          <span className={cn('flex-1', m.status === 'skipped' && 'line-through text-muted-foreground')}>
                            {m.name}
                          </span>
                          {m.targetDate && (
                            <span className="text-xs text-muted-foreground shrink-0">{formatDate(m.targetDate)}</span>
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            {m.status !== 'completed' && (
                              <button
                                onClick={() => updateMilestone(r.id, m.id, { status: 'completed', actualDate: new Date().toISOString().split('T')[0] })}
                                className="text-xs text-emerald-600 hover:underline"
                              >
                                Done
                              </button>
                            )}
                            {m.status === 'pending' && (
                              <button
                                onClick={() => updateMilestone(r.id, m.id, { status: 'in_progress' })}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Start
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>New Rehab Project</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Property *</Label>
              <Select value={form.propertyId} onValueChange={v => setForm(f => ({ ...f, propertyId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select property…" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.addressLine1}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scope / Description</Label>
              <textarea
                value={form.scope}
                onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                placeholder="What work is being done?"
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Target End Date</Label>
                <Input
                  type="date"
                  value={form.targetEndDate}
                  onChange={e => setForm(f => ({ ...f, targetEndDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Original Estimate ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.originalEstimate}
                onChange={e => setForm(f => ({ ...f, originalEstimate: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Default milestones (Demo → Final Clean) will be auto-created. Property status will be set to Rehab.
            </p>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createRehab} disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
