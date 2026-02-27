'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  getVacancyDays,
  getVacancyUrgency,
  VACANCY_BAR_COLOR,
  VACANCY_TEXT_COLOR,
  VACANCY_BORDER_COLOR,
  VACANCY_MESSAGE,
} from '@/lib/vacancy'
import type { PropertyDetailData, InsurancePolicyData } from '@/types/property'
import { cn } from '@/lib/utils'

const EMPTY_FORM = {
  carrier: '',
  policyNumber: '',
  policyType: 'standard',
  premiumAnnual: '',
  liabilityLimit: '',
  premisesLimit: '',
  effectiveDate: '',
  expirationDate: '',
  notes: '',
}

export function InsuranceTab({ data }: { data: PropertyDetailData }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<InsurancePolicyData | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const vacancyDays = data.vacantSince ? getVacancyDays(data.vacantSince) : 0
  const urgency = getVacancyUrgency(vacancyDays)

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(policy: InsurancePolicyData) {
    setEditing(policy)
    setForm({
      carrier: policy.carrier,
      policyNumber: policy.policyNumber ?? '',
      policyType: policy.policyType,
      premiumAnnual: policy.premiumAnnual?.toString() ?? '',
      liabilityLimit: policy.liabilityLimit?.toString() ?? '',
      premisesLimit: policy.premisesLimit?.toString() ?? '',
      effectiveDate: policy.effectiveDate ?? '',
      expirationDate: policy.expirationDate ?? '',
      notes: policy.notes ?? '',
    })
    setOpen(true)
  }

  async function save() {
    if (!form.carrier.trim()) {
      toast.error('Carrier name is required')
      return
    }
    setSaving(true)
    try {
      const url = editing
        ? `/api/properties/${data.id}/insurance/${editing.id}`
        : `/api/properties/${data.id}/insurance`
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(editing ? 'Policy updated' : 'Policy added')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function deletePolicy(policyId: string) {
    if (!confirm('Delete this insurance policy?')) return
    const res = await fetch(`/api/properties/${data.id}/insurance/${policyId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success('Policy deleted')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Vacancy Countdown */}
      {data.status === 'vacant' && data.vacantSince && (
        <div className={cn('rounded-lg border p-4', VACANCY_BORDER_COLOR[urgency])}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Vacancy Insurance Risk</p>
            <span className={cn('text-sm font-bold tabular-nums', VACANCY_TEXT_COLOR[urgency])}>
              {vacancyDays} / 60 days
            </span>
          </div>
          <Progress
            value={Math.min(100, (vacancyDays / 60) * 100)}
            className="h-2 mb-2"
          />
          <p className={cn('text-xs font-medium', VACANCY_TEXT_COLOR[urgency])}>
            {VACANCY_MESSAGE[urgency]}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Vacant since {formatDate(data.vacantSince)}
          </p>
        </div>
      )}

      {/* Policies List */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Insurance Policies</CardTitle>
          <Button size="sm" variant="outline" onClick={openAdd} className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Policy
          </Button>
        </CardHeader>
        <CardContent>
          {data.insurancePolicies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No insurance policies on file.
            </p>
          ) : (
            <div className="space-y-3">
              {data.insurancePolicies.map(policy => (
                <div key={policy.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{policy.carrier}</p>
                        <Badge variant="outline" className="text-xs">
                          {policy.policyType === 'vacancy' ? 'Vacancy' : 'Standard'}
                        </Badge>
                      </div>
                      {policy.policyNumber && (
                        <p className="text-xs text-muted-foreground mt-0.5">Policy #{policy.policyNumber}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {policy.declarationUrl && (
                        <a href={policy.declarationUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(policy)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deletePolicy(policy.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-sm">
                    <InfoField label="Annual Premium" value={formatCurrency(policy.premiumAnnual)} />
                    <InfoField label="Liability Limit" value={formatCurrency(policy.liabilityLimit)} />
                    <InfoField label="Premises Limit" value={formatCurrency(policy.premisesLimit)} />
                    <InfoField label="Effective" value={formatDate(policy.effectiveDate)} />
                    <InfoField
                      label="Expires"
                      value={formatDate(policy.expirationDate)}
                    />
                  </dl>
                  {policy.notes && (
                    <p className="text-xs text-muted-foreground mt-2">{policy.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Policy' : 'Add Insurance Policy'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Carrier *</Label>
              <Input
                value={form.carrier}
                onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))}
                placeholder="e.g. State Farm"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Policy Number</Label>
                <Input
                  value={form.policyNumber}
                  onChange={e => setForm(f => ({ ...f, policyNumber: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Policy Type</Label>
                <Select value={form.policyType} onValueChange={v => setForm(f => ({ ...f, policyType: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="vacancy">Vacancy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={form.effectiveDate}
                  onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Expiration Date</Label>
                <Input
                  type="date"
                  value={form.expirationDate}
                  onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Annual Premium ($)</Label>
              <Input
                type="number"
                value={form.premiumAnnual}
                onChange={e => setForm(f => ({ ...f, premiumAnnual: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Liability Limit ($)</Label>
                <Input
                  type="number"
                  value={form.liabilityLimit}
                  onChange={e => setForm(f => ({ ...f, liabilityLimit: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Premises Limit ($)</Label>
                <Input
                  type="number"
                  value={form.premisesLimit}
                  onChange={e => setForm(f => ({ ...f, premisesLimit: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Policy'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
