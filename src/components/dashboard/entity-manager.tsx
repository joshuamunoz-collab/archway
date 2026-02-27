'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Building2, CreditCard, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BankAccount {
  id: string
  accountName: string
  accountType: string
  institution: string | null
  lastFour: string | null
  isDefault: boolean
  notes: string | null
}

interface Entity {
  id: string
  name: string
  ein: string | null
  address: string | null
  phone: string | null
  email: string | null
  pmFeePct: number
  notes: string | null
  bankAccounts: BankAccount[]
}

// ── Entity form defaults ───────────────────────────────────────────────────

const EMPTY_ENTITY = {
  name: '', ein: '', address: '', phone: '', email: '', pmFeePct: '10', notes: '',
}

const EMPTY_ACCOUNT = {
  accountName: '', accountType: 'checking', institution: '', lastFour: '', isDefault: false, notes: '',
}

// ── Main component ─────────────────────────────────────────────────────────

export function EntityManager({ initial }: { initial: Entity[] }) {
  const [entities, setEntities] = useState<Entity[]>(initial)

  // Entity sheet state
  const [entitySheet, setEntitySheet] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [entityForm, setEntityForm] = useState({ ...EMPTY_ENTITY })
  const [entitySaving, setEntitySaving] = useState(false)
  const [deletingEntityId, setDeletingEntityId] = useState<string | null>(null)

  // Bank account sheet state
  const [accountSheet, setAccountSheet] = useState(false)
  const [accountEntityId, setAccountEntityId] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [accountForm, setAccountForm] = useState({ ...EMPTY_ACCOUNT })
  const [accountSaving, setAccountSaving] = useState(false)

  // ── Entity CRUD ────────────────────────────────────────────────────────

  function openAddEntity() {
    setEditingEntity(null)
    setEntityForm({ ...EMPTY_ENTITY })
    setEntitySheet(true)
  }

  function openEditEntity(entity: Entity) {
    setEditingEntity(entity)
    setEntityForm({
      name: entity.name,
      ein: entity.ein ?? '',
      address: entity.address ?? '',
      phone: entity.phone ?? '',
      email: entity.email ?? '',
      pmFeePct: String(entity.pmFeePct),
      notes: entity.notes ?? '',
    })
    setEntitySheet(true)
  }

  async function saveEntity() {
    setEntitySaving(true)
    try {
      const payload = {
        name: entityForm.name,
        ein: entityForm.ein,
        address: entityForm.address,
        phone: entityForm.phone,
        email: entityForm.email,
        pmFeePct: parseFloat(entityForm.pmFeePct) || 10,
        notes: entityForm.notes,
      }

      const url = editingEntity ? `/api/entities/${editingEntity.id}` : '/api/entities'
      const method = editingEntity ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save entity')
        return
      }

      if (editingEntity) {
        setEntities(prev => prev.map(e => e.id === data.id ? data : e))
        toast.success('Entity updated')
      } else {
        setEntities(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Entity created')
      }
      setEntitySheet(false)
    } finally {
      setEntitySaving(false)
    }
  }

  async function deleteEntity(id: string) {
    setDeletingEntityId(id)
    try {
      const res = await fetch(`/api/entities/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to delete entity')
        return
      }
      setEntities(prev => prev.filter(e => e.id !== id))
      toast.success('Entity deleted')
    } finally {
      setDeletingEntityId(null)
    }
  }

  // ── Bank account CRUD ──────────────────────────────────────────────────

  function openAddAccount(entityId: string) {
    setAccountEntityId(entityId)
    setEditingAccount(null)
    setAccountForm({ ...EMPTY_ACCOUNT })
    setAccountSheet(true)
  }

  function openEditAccount(entityId: string, account: BankAccount) {
    setAccountEntityId(entityId)
    setEditingAccount(account)
    setAccountForm({
      accountName: account.accountName,
      accountType: account.accountType,
      institution: account.institution ?? '',
      lastFour: account.lastFour ?? '',
      isDefault: account.isDefault,
      notes: account.notes ?? '',
    })
    setAccountSheet(true)
  }

  async function saveAccount() {
    if (!accountEntityId) return
    setAccountSaving(true)
    try {
      const url = editingAccount
        ? `/api/entities/${accountEntityId}/bank-accounts/${editingAccount.id}`
        : `/api/entities/${accountEntityId}/bank-accounts`
      const method = editingAccount ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save account')
        return
      }

      // Refresh entity list to get updated bank accounts
      const entitiesRes = await fetch('/api/entities')
      const updated = await entitiesRes.json()
      setEntities(updated)

      toast.success(editingAccount ? 'Account updated' : 'Account added')
      setAccountSheet(false)
    } finally {
      setAccountSaving(false)
    }
  }

  async function deleteAccount(entityId: string, accountId: string) {
    const res = await fetch(`/api/entities/${entityId}/bank-accounts/${accountId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to delete account')
      return
    }
    setEntities(prev =>
      prev.map(e =>
        e.id === entityId
          ? { ...e, bankAccounts: e.bankAccounts.filter(a => a.id !== accountId) }
          : e
      )
    )
    toast.success('Account removed')
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Entities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Owning entities and their bank accounts.</p>
        </div>
        <Button onClick={openAddEntity} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Entity
        </Button>
      </div>

      {/* Entity cards */}
      {entities.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          No entities yet. Add your first entity above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {entities.map(entity => (
            <Card key={entity.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <CardTitle className="text-base truncate">{entity.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEntity(entity)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteEntity(entity.id)}
                      disabled={deletingEntityId === entity.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">PM fee: {entity.pmFeePct}%</Badge>
                  {entity.ein && <Badge variant="outline" className="text-xs">EIN: {entity.ein}</Badge>}
                </div>

                {(entity.email || entity.phone) && (
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {entity.email && <div>{entity.email}</div>}
                    {entity.phone && <div>{entity.phone}</div>}
                  </div>
                )}
              </CardHeader>

              <Separator />

              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bank Accounts</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => openAddAccount(entity.id)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>

                {entity.bankAccounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No accounts yet</p>
                ) : (
                  <div className="space-y-2">
                    {entity.bankAccounts.map(account => (
                      <div key={account.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{account.accountName}</span>
                              {account.isDefault && (
                                <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {account.accountType === 'money_market' ? 'Money Market' : 'Checking'}
                              {account.lastFour && ` ···· ${account.lastFour}`}
                              {account.institution && ` · ${account.institution}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditAccount(entity.id, account)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => deleteAccount(entity.id, account.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Entity Sheet */}
      <Sheet open={entitySheet} onOpenChange={setEntitySheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingEntity ? 'Edit Entity' : 'Add Entity'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="ename">Name <span className="text-destructive">*</span></Label>
              <Input
                id="ename"
                value={entityForm.name}
                onChange={e => setEntityForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Entity A LLC"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ein">EIN</Label>
              <Input
                id="ein"
                value={entityForm.ein}
                onChange={e => setEntityForm(f => ({ ...f, ein: e.target.value }))}
                placeholder="XX-XXXXXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eaddress">Address</Label>
              <Input
                id="eaddress"
                value={entityForm.address}
                onChange={e => setEntityForm(f => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, St. Louis, MO 63101"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ephone">Phone</Label>
                <Input
                  id="ephone"
                  value={entityForm.phone}
                  onChange={e => setEntityForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(314) 555-0100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eemail">Email</Label>
                <Input
                  id="eemail"
                  type="email"
                  value={entityForm.email}
                  onChange={e => setEntityForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@entity.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pmfee">PM Fee %</Label>
              <Input
                id="pmfee"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={entityForm.pmFeePct}
                onChange={e => setEntityForm(f => ({ ...f, pmFeePct: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enotes">Notes</Label>
              <Input
                id="enotes"
                value={entityForm.notes}
                onChange={e => setEntityForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setEntitySheet(false)}>Cancel</Button>
            <Button onClick={saveEntity} disabled={entitySaving || !entityForm.name.trim()}>
              {entitySaving ? 'Saving…' : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bank Account Sheet */}
      <Sheet open={accountSheet} onOpenChange={setAccountSheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="aname">Account Name <span className="text-destructive">*</span></Label>
              <Input
                id="aname"
                value={accountForm.accountName}
                onChange={e => setAccountForm(f => ({ ...f, accountName: e.target.value }))}
                placeholder="Operating Checking"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="atype">Account Type</Label>
              <Select
                value={accountForm.accountType}
                onValueChange={v => setAccountForm(f => ({ ...f, accountType: v }))}
              >
                <SelectTrigger id="atype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="money_market">Money Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ainst">Institution</Label>
                <Input
                  id="ainst"
                  value={accountForm.institution}
                  onChange={e => setAccountForm(f => ({ ...f, institution: e.target.value }))}
                  placeholder="First Bank"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alast4">Last 4 Digits</Label>
                <Input
                  id="alast4"
                  maxLength={4}
                  value={accountForm.lastFour}
                  onChange={e => setAccountForm(f => ({ ...f, lastFour: e.target.value.replace(/\D/g, '') }))}
                  placeholder="1234"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="adefault"
                type="checkbox"
                checked={accountForm.isDefault}
                onChange={e => setAccountForm(f => ({ ...f, isDefault: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              <Label htmlFor="adefault" className="cursor-pointer">Set as default account</Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="anotes">Notes</Label>
              <Input
                id="anotes"
                value={accountForm.notes}
                onChange={e => setAccountForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setAccountSheet(false)}>Cancel</Button>
            <Button onClick={saveAccount} disabled={accountSaving || !accountForm.accountName.trim()}>
              {accountSaving ? 'Saving…' : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
