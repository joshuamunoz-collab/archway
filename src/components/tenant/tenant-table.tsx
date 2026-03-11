'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Users, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { formatCurrency, formatDate } from '@/lib/format'

interface ActiveLease {
  id: string
  startDate: string
  endDate: string | null
  contractRent: number
  property: {
    id: string
    addressLine1: string
    addressLine2: string | null
    entity: { id: string; name: string } | null
  }
}

interface TenantRow {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  voucherNumber: string | null
  phaCaseworker: string | null
  phaPhone: string | null
  notes: string | null
  createdAt: string
  activeLease: ActiveLease | null
}

interface EntityGroup {
  entityName: string
  entityId: string | null
  tenants: TenantRow[]
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  voucherNumber: '',
  phaCaseworker: '',
  phaPhone: '',
  notes: '',
}

function groupByEntity(tenants: TenantRow[]): EntityGroup[] {
  const map = new Map<string, EntityGroup>()

  for (const tenant of tenants) {
    const entityName = tenant.activeLease?.property.entity?.name ?? 'Unassigned'
    const entityId = tenant.activeLease?.property.entity?.id ?? null

    let group = map.get(entityName)
    if (!group) {
      group = { entityName, entityId, tenants: [] }
      map.set(entityName, group)
    }
    group.tenants.push(tenant)
  }

  // Sort: named entities first (alphabetically), "Unassigned" last
  const groups = Array.from(map.values())
  groups.sort((a, b) => {
    if (a.entityName === 'Unassigned') return 1
    if (b.entityName === 'Unassigned') return -1
    return a.entityName.localeCompare(b.entityName)
  })

  return groups
}

export function TenantTable({ tenants: initialTenants }: { tenants: TenantRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TenantRow | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const syncAttempted = useRef(false)

  // Auto-sync: if DB has no tenants, extract from localStorage financials data and push to DB
  useEffect(() => {
    if (initialTenants.length > 0 || syncAttempted.current) return
    syncAttempted.current = true

    const saved = localStorage.getItem('archway_financials_v2')
    if (!saved) return

    let entries: { tenantName: string; propertyAddress: string; contractRent: number }[] = []
    try {
      const data = JSON.parse(saved) as Record<string, Record<string, { tenant: string; address: string; rent: number }[]>>
      const seen = new Set<string>()
      for (const months of Object.values(data)) {
        for (const props of Object.values(months)) {
          for (const prop of props) {
            if (prop.tenant && prop.tenant !== '—') {
              for (const name of prop.tenant.split(',')) {
                const trimmed = name.trim()
                const key = `${trimmed.toLowerCase()}|${prop.address.toLowerCase()}`
                if (trimmed && !seen.has(key)) {
                  seen.add(key)
                  entries.push({ tenantName: trimmed, propertyAddress: prop.address, contractRent: prop.rent || 0 })
                }
              }
            }
          }
        }
      }
    } catch { /* ignore parse errors */ }

    if (entries.length === 0) return

    setSyncing(true)

    const doSync = (retry: boolean) => {
      fetch('/api/import/tenants-from-cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      }).then(res => {
        if (res.ok) return res.json()
        throw new Error('sync failed')
      }).then(result => {
        if (result && (result.tenantsCreated > 0 || result.leasesCreated > 0)) {
          router.refresh()
        }
        setSyncing(false)
      }).catch(() => {
        if (retry) {
          setTimeout(() => doSync(false), 2000)
        } else {
          console.warn('[TenantTable] Tenant sync failed after retry')
          setSyncing(false)
        }
      })
    }

    doSync(true)
  }, [initialTenants.length, router])

  const filtered = useMemo(() => {
    if (!search.trim()) return initialTenants
    const q = search.toLowerCase()
    return initialTenants.filter(t =>
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
      t.phone?.includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.voucherNumber?.toLowerCase().includes(q) ||
      t.activeLease?.property.addressLine1.toLowerCase().includes(q) ||
      t.activeLease?.property.entity?.name.toLowerCase().includes(q)
    )
  }, [initialTenants, search])

  const entityGroups = useMemo(() => groupByEntity(filtered), [filtered])

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(tenant: TenantRow) {
    setEditing(tenant)
    setForm({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      phone: tenant.phone ?? '',
      email: tenant.email ?? '',
      voucherNumber: tenant.voucherNumber ?? '',
      phaCaseworker: tenant.phaCaseworker ?? '',
      phaPhone: tenant.phaPhone ?? '',
      notes: tenant.notes ?? '',
    })
    setOpen(true)
  }

  async function save() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required')
      return
    }
    setSaving(true)
    try {
      const url = editing ? `/api/tenants/${editing.id}` : '/api/tenants'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(editing ? 'Tenant updated' : 'Tenant added')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTenant(tenant: TenantRow) {
    if (tenant.activeLease) {
      toast.error('Cannot delete a tenant with an active lease')
      return
    }
    if (!confirm(`Delete ${tenant.firstName} ${tenant.lastName}? This cannot be undone.`)) return
    const res = await fetch(`/api/tenants/${tenant.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error((await res.json()).error ?? 'Failed to delete')
      return
    }
    toast.success('Tenant deleted')
    router.refresh()
  }

  return (
    <div className="px-8 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <span className="text-sm text-muted-foreground">({initialTenants.length})</span>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Tenant
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants, properties, entities…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Content */}
      {syncing ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, ci) => (
            <div key={ci} className="rounded-xl border border-gray-200/60 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-2" />
              </div>
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, ri) => (
                    <tr key={ri}>
                      <td className="px-4 py-3"><div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-8 bg-gray-200 rounded animate-pulse" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No tenants match your search.' : 'No tenants yet. Add your first tenant.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {entityGroups.map(group => (
            <div key={group.entityName} className="rounded-xl border border-gray-200/60 bg-white shadow-sm overflow-hidden">
              {/* Entity card header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-gray-800">{group.entityName}</h2>
                <span className="text-xs text-muted-foreground ml-1">
                  · {group.tenants.length} tenant{group.tenants.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Rows */}
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {group.tenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 truncate">
                        {tenant.activeLease ? (
                          <Link
                            href={`/properties/${tenant.activeLease.property.id}`}
                            className="text-primary hover:underline text-sm"
                          >
                            {tenant.activeLease.property.addressLine1}
                            {tenant.activeLease.property.addressLine2 && (
                              <span className="text-muted-foreground"> · {tenant.activeLease.property.addressLine2}</span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">No active lease</span>
                        )}
                      </td>
                      <td className="px-4 py-3 truncate">
                        <div className="font-medium text-sm truncate">
                          {tenant.lastName}, {tenant.firstName}
                        </div>
                        {tenant.phone && (
                          <div className="text-xs text-muted-foreground truncate">{tenant.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm truncate">
                        {tenant.activeLease?.endDate
                          ? `Ends ${formatDate(tenant.activeLease.endDate)}`
                          : tenant.activeLease
                          ? 'Month-to-month'
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {tenant.activeLease ? formatCurrency(tenant.activeLease.contractRent) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(tenant)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteTenant(tenant)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Tenant' : 'Add Tenant'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="Jane"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Smith"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(314) 555-0100"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Voucher Number</Label>
              <Input
                value={form.voucherNumber}
                onChange={e => setForm(f => ({ ...f, voucherNumber: e.target.value }))}
                placeholder="HCV-12345"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>PHA Caseworker</Label>
                <Input
                  value={form.phaCaseworker}
                  onChange={e => setForm(f => ({ ...f, phaCaseworker: e.target.value }))}
                  placeholder="Name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>PHA Phone</Label>
                <Input
                  value={form.phaPhone}
                  onChange={e => setForm(f => ({ ...f, phaPhone: e.target.value }))}
                  placeholder="(314) 555-0200"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes…"
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Tenant'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
