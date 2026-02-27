'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { formatCurrency, formatDate, daysFromNow } from '@/lib/format'
import type { PropertyDetailData } from '@/types/property'

interface TenantOption {
  id: string
  firstName: string
  lastName: string
}

const EMPTY_LEASE_FORM = {
  tenantId: '',
  startDate: '',
  endDate: '',
  contractRent: '',
  hapAmount: '',
  tenantCopay: '',
  utilityAllowance: '',
  paymentStandard: '',
  hapContractStart: '',
  hapContractEnd: '',
  recertificationDate: '',
  notes: '',
}

export function OverviewTab({ data }: { data: PropertyDetailData }) {
  const router = useRouter()
  const { activeLease, ytdIncome, ytdExpenses, recentActivity } = data

  const [leaseOpen, setLeaseOpen] = useState(false)
  const [leaseForm, setLeaseForm] = useState(EMPTY_LEASE_FORM)
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [savingLease, setSavingLease] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  async function openAddLease() {
    setIsEditing(false)
    setLeaseForm(EMPTY_LEASE_FORM)
    await fetchTenants()
    setLeaseOpen(true)
  }

  async function openEditLease() {
    if (!activeLease) return
    setIsEditing(true)
    setLeaseForm({
      tenantId: activeLease.tenantId,
      startDate: activeLease.startDate.slice(0, 10),
      endDate: activeLease.endDate?.slice(0, 10) ?? '',
      contractRent: String(activeLease.contractRent),
      hapAmount: activeLease.hapAmount != null ? String(activeLease.hapAmount) : '',
      tenantCopay: activeLease.tenantCopay != null ? String(activeLease.tenantCopay) : '',
      utilityAllowance: activeLease.utilityAllowance != null ? String(activeLease.utilityAllowance) : '',
      paymentStandard: activeLease.paymentStandard != null ? String(activeLease.paymentStandard) : '',
      hapContractStart: activeLease.hapContractStart?.slice(0, 10) ?? '',
      hapContractEnd: activeLease.hapContractEnd?.slice(0, 10) ?? '',
      recertificationDate: activeLease.recertificationDate?.slice(0, 10) ?? '',
      notes: activeLease.notes ?? '',
    })
    await fetchTenants()
    setLeaseOpen(true)
  }

  async function fetchTenants() {
    if (tenants.length > 0) return
    try {
      const res = await fetch('/api/tenants')
      if (res.ok) {
        const data = await res.json()
        setTenants(data.map((t: { id: string; firstName: string; lastName: string }) => ({
          id: t.id,
          firstName: t.firstName,
          lastName: t.lastName,
        })))
      }
    } catch { /* ignore */ }
  }

  async function saveLease() {
    if (!leaseForm.tenantId || !leaseForm.startDate || !leaseForm.contractRent) {
      toast.error('Tenant, start date, and contract rent are required')
      return
    }
    setSavingLease(true)
    try {
      const payload = {
        tenantId: leaseForm.tenantId,
        startDate: leaseForm.startDate,
        endDate: leaseForm.endDate || null,
        contractRent: parseFloat(leaseForm.contractRent),
        hapAmount: leaseForm.hapAmount ? parseFloat(leaseForm.hapAmount) : null,
        tenantCopay: leaseForm.tenantCopay ? parseFloat(leaseForm.tenantCopay) : null,
        utilityAllowance: leaseForm.utilityAllowance ? parseFloat(leaseForm.utilityAllowance) : null,
        paymentStandard: leaseForm.paymentStandard ? parseFloat(leaseForm.paymentStandard) : null,
        hapContractStart: leaseForm.hapContractStart || null,
        hapContractEnd: leaseForm.hapContractEnd || null,
        recertificationDate: leaseForm.recertificationDate || null,
        notes: leaseForm.notes || null,
      }

      let url = `/api/properties/${data.id}/leases`
      let method = 'POST'
      if (isEditing && activeLease) {
        url = `/api/properties/${data.id}/leases/${activeLease.id}`
        method = 'PATCH'
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(isEditing ? 'Lease updated' : 'Lease created')
      setLeaseOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save lease')
    } finally {
      setSavingLease(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Property Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Property Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <InfoField label="Type" value={data.propertyType?.replace('_', ' ') ?? '—'} />
            <InfoField label="Beds" value={data.beds?.toString() ?? '—'} />
            <InfoField label="Baths" value={data.baths?.toString() ?? '—'} />
            <InfoField label="Sq Ft" value={data.sqft?.toLocaleString() ?? '—'} />
            <InfoField label="Year Built" value={data.yearBuilt?.toString() ?? '—'} />
            <InfoField label="Parcel #" value={data.parcelNumber ?? '—'} />
            <InfoField label="Ward" value={data.ward ?? '—'} />
            <InfoField label="Neighborhood" value={data.neighborhood ?? '—'} />
            <InfoField label="Entity" value={data.entity.name} />
            <InfoField label="Section 8" value={data.isSection8 ? 'Yes' : 'No'} />
          </dl>
          {data.notes && (
            <div className="mt-4 text-sm text-muted-foreground border-t pt-4">
              <p className="font-medium text-foreground mb-1">Notes</p>
              <p>{data.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease Summary */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Current Lease</CardTitle>
          {activeLease ? (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openEditLease}>
              <Pencil className="h-3.5 w-3.5" /> Edit Lease
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openAddLease}>
              <Plus className="h-3.5 w-3.5" /> Add Lease
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activeLease ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoField
                label="Tenant"
                value={`${activeLease.tenant.firstName} ${activeLease.tenant.lastName}`}
              />
              <InfoField label="Phone" value={activeLease.tenant.phone ?? '—'} />
              <InfoField label="Email" value={activeLease.tenant.email ?? '—'} />
              <InfoField label="Lease Start" value={formatDate(activeLease.startDate)} />
              <InfoField
                label="Lease End"
                value={activeLease.endDate ? formatDate(activeLease.endDate) : 'Month-to-month'}
                highlight={(() => {
                  if (!activeLease.endDate) return undefined
                  const d = daysFromNow(activeLease.endDate) ?? 99
                  return d <= 30 ? 'red' : d <= 60 ? 'amber' : undefined
                })()}
              />
              <InfoField label="Contract Rent" value={formatCurrency(activeLease.contractRent)} />
              {data.isSection8 && (
                <>
                  <InfoField label="HAP Amount" value={formatCurrency(activeLease.hapAmount)} />
                  <InfoField label="Tenant Copay" value={formatCurrency(activeLease.tenantCopay)} />
                  <InfoField
                    label="Recertification"
                    value={formatDate(activeLease.recertificationDate)}
                    highlight={(() => {
                      if (!activeLease.recertificationDate) return undefined
                      const d = daysFromNow(activeLease.recertificationDate) ?? 99
                      return d <= 30 ? 'red' : d <= 60 ? 'amber' : undefined
                    })()}
                  />
                </>
              )}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No active lease</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Add Lease" to assign a tenant.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="YTD Income" value={formatCurrency(ytdIncome)} />
        <StatCard label="YTD Expenses" value={formatCurrency(ytdExpenses)} />
        <StatCard
          label="YTD NOI"
          value={formatCurrency(ytdIncome - ytdExpenses)}
          highlight={ytdIncome - ytdExpenses < 0 ? 'red' : undefined}
        />
        {activeLease && (
          <StatCard
            label="Tenant Since"
            value={formatDate(activeLease.startDate)}
          />
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 10).map(entry => (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                  <span className="text-muted-foreground text-xs w-28 shrink-0 pt-0.5">
                    {new Date(entry.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: '2-digit',
                    })}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{formatAction(entry.action)}</span>
                    {entry.user && (
                      <span className="text-muted-foreground"> · {entry.user.fullName}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease Sheet */}
      <Sheet open={leaseOpen} onOpenChange={setLeaseOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditing ? 'Edit Lease' : 'Add Lease'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {!isEditing && (
              <div>
                <Label>Tenant *</Label>
                <Select value={leaseForm.tenantId} onValueChange={v => setLeaseForm(f => ({ ...f, tenantId: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select tenant…" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No tenants found. Add one first.</div>
                    ) : (
                      tenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={leaseForm.startDate}
                  onChange={e => setLeaseForm(f => ({ ...f, startDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={leaseForm.endDate}
                  onChange={e => setLeaseForm(f => ({ ...f, endDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Contract Rent *</Label>
              <Input
                type="number"
                step="0.01"
                value={leaseForm.contractRent}
                onChange={e => setLeaseForm(f => ({ ...f, contractRent: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pt-1">Section 8 Details</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>HAP Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={leaseForm.hapAmount}
                  onChange={e => setLeaseForm(f => ({ ...f, hapAmount: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tenant Copay</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={leaseForm.tenantCopay}
                  onChange={e => setLeaseForm(f => ({ ...f, tenantCopay: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Utility Allowance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={leaseForm.utilityAllowance}
                  onChange={e => setLeaseForm(f => ({ ...f, utilityAllowance: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Payment Standard</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={leaseForm.paymentStandard}
                  onChange={e => setLeaseForm(f => ({ ...f, paymentStandard: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>HAP Contract Start</Label>
                <Input
                  type="date"
                  value={leaseForm.hapContractStart}
                  onChange={e => setLeaseForm(f => ({ ...f, hapContractStart: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>HAP Contract End</Label>
                <Input
                  type="date"
                  value={leaseForm.hapContractEnd}
                  onChange={e => setLeaseForm(f => ({ ...f, hapContractEnd: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Recertification Date</Label>
              <Input
                type="date"
                value={leaseForm.recertificationDate}
                onChange={e => setLeaseForm(f => ({ ...f, recertificationDate: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={leaseForm.notes}
                onChange={e => setLeaseForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes…"
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setLeaseOpen(false)}>Cancel</Button>
            <Button onClick={saveLease} disabled={savingLease}>
              {savingLease ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Lease'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function InfoField({
  label,
  value,
  highlight,
}: {
  label: string
  value: string | null | undefined
  highlight?: 'red' | 'amber'
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground font-medium">{label}</dt>
      <dd className={`text-sm mt-0.5 ${highlight === 'red' ? 'text-red-600 font-medium' : highlight === 'amber' ? 'text-amber-600 font-medium' : 'text-foreground'}`}>
        {value ?? '—'}
      </dd>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'red'
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={`text-xl font-bold mt-0.5 tabular-nums ${highlight === 'red' ? 'text-red-600' : 'text-foreground'}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
