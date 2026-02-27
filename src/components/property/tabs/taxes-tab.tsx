'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ExternalLink, Copy } from 'lucide-react'
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
import { formatCurrency, formatDate } from '@/lib/format'
import type { PropertyDetailData, PropertyTaxData } from '@/types/property'
import { cn } from '@/lib/utils'

const TAX_STATUS_COLORS: Record<string, string> = {
  paid:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  unpaid:     'bg-amber-50 text-amber-700 border-amber-200',
  delinquent: 'bg-red-50 text-red-700 border-red-200',
}

const EMPTY_FORM = {
  taxYear: new Date().getFullYear().toString(),
  assessedValue: '',
  annualAmount: '',
  status: 'unpaid',
  paidDate: '',
  paidAmount: '',
  notes: '',
}

export function TaxesTab({ data }: { data: PropertyDetailData }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PropertyTaxData | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(tax: PropertyTaxData) {
    setEditing(tax)
    setForm({
      taxYear: tax.taxYear.toString(),
      assessedValue: tax.assessedValue?.toString() ?? '',
      annualAmount: tax.annualAmount?.toString() ?? '',
      status: tax.status,
      paidDate: tax.paidDate ?? '',
      paidAmount: tax.paidAmount?.toString() ?? '',
      notes: tax.notes ?? '',
    })
    setOpen(true)
  }

  async function save() {
    if (!form.taxYear) { toast.error('Tax year is required'); return }
    setSaving(true)
    try {
      const url = editing
        ? `/api/properties/${data.id}/taxes/${editing.id}`
        : `/api/properties/${data.id}/taxes`
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(editing ? 'Tax record updated' : 'Tax record added')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTax(taxId: string) {
    if (!confirm('Delete this tax record?')) return
    const res = await fetch(`/api/properties/${data.id}/taxes/${taxId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success('Tax record deleted')
    router.refresh()
  }

  function copyParcel() {
    if (data.parcelNumber) {
      navigator.clipboard.writeText(data.parcelNumber)
      toast.success('Parcel number copied')
    }
  }

  return (
    <div className="space-y-6">
      {/* Parcel Number + Tax Lookup */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Parcel Number</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-lg font-mono font-semibold">
                  {data.parcelNumber ?? '—'}
                </p>
                {data.parcelNumber && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyParcel}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <a
              href="https://property.stlouis-mo.gov/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                STL Tax Portal
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Search by parcel number above on the St. Louis City Tax Portal
          </p>
        </CardContent>
      </Card>

      {/* Tax Records */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Tax History</CardTitle>
          <Button size="sm" variant="outline" onClick={openAdd} className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Record
          </Button>
        </CardHeader>
        <CardContent>
          {data.propertyTaxes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No tax records on file.</p>
          ) : (
            <div className="space-y-3">
              {data.propertyTaxes.map(tax => (
                <div key={tax.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{tax.taxYear}</p>
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        TAX_STATUS_COLORS[tax.status] ?? 'bg-secondary text-foreground border-border'
                      )}>
                        {tax.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tax)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteTax(tax.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-sm">
                    <InfoField label="Annual Amount" value={formatCurrency(tax.annualAmount)} />
                    <InfoField label="Assessed Value" value={formatCurrency(tax.assessedValue)} />
                    {tax.paidDate && <InfoField label="Paid Date" value={formatDate(tax.paidDate)} />}
                    {tax.paidAmount !== null && <InfoField label="Paid Amount" value={formatCurrency(tax.paidAmount)} />}
                  </dl>
                  {tax.notes && (
                    <p className="text-xs text-muted-foreground mt-2">{tax.notes}</p>
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
            <SheetTitle>{editing ? 'Edit Tax Record' : 'Add Tax Record'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tax Year *</Label>
                <Input
                  type="number"
                  value={form.taxYear}
                  onChange={e => setForm(f => ({ ...f, taxYear: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="delinquent">Delinquent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Annual Amount ($)</Label>
                <Input
                  type="number"
                  value={form.annualAmount}
                  onChange={e => setForm(f => ({ ...f, annualAmount: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Assessed Value ($)</Label>
                <Input
                  type="number"
                  value={form.assessedValue}
                  onChange={e => setForm(f => ({ ...f, assessedValue: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Paid Date</Label>
                <Input
                  type="date"
                  value={form.paidDate}
                  onChange={e => setForm(f => ({ ...f, paidDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Paid Amount ($)</Label>
                <Input
                  type="number"
                  value={form.paidAmount}
                  onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Special assessments, abatements, etc."
                className="mt-1"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Record'}
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
      <dd className="font-medium text-sm">{value}</dd>
    </div>
  )
}
