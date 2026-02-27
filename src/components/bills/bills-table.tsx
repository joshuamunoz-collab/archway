'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, FileText, ChevronDown, CheckSquare, Trash2, Check, X, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface LineItem {
  id?: string
  description: string
  category: string | null
  subcategory: string | null
  amount: number
  sortOrder: number
}

interface BillRow {
  id: string
  propertyId: string
  property: { id: string; addressLine1: string; addressLine2: string | null; entity: { id: string; name: string } }
  vendorName: string | null
  invoiceNumber: string | null
  billDate: string
  dueDate: string | null
  totalAmount: number
  status: string
  approvedBy: string | null
  approvedAt: string | null
  paidDate: string | null
  paymentMethod: string | null
  paymentReference: string | null
  invoiceUrl: string | null
  notes: string | null
  createdAt: string
  approver: { fullName: string } | null
  lineItems: LineItem[]
}

interface PropertyOption {
  id: string
  addressLine1: string
  addressLine2: string | null
}

const STATUS_TABS = [
  { value: 'all',          label: 'All' },
  { value: 'received',     label: 'Needs Review' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved',     label: 'Approved' },
  { value: 'disputed',     label: 'Disputed' },
  { value: 'paid',         label: 'Paid' },
]

const STATUS_BADGE: Record<string, string> = {
  received:     'bg-blue-50 text-blue-700 border-blue-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  approved:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  disputed:     'bg-red-50 text-red-700 border-red-200',
  paid:         'bg-secondary text-muted-foreground border-border',
}

const STATUS_LABEL: Record<string, string> = {
  received:     'Needs Review',
  under_review: 'Under Review',
  approved:     'Approved',
  disputed:     'Disputed',
  paid:         'Paid',
}

const PAYMENT_METHODS = [
  { value: 'check', label: 'Check' },
  { value: 'ach',   label: 'ACH' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'cash',  label: 'Cash' },
]

function emptyLineItem(): LineItem {
  return { description: '', category: null, subcategory: null, amount: 0, sortOrder: 0 }
}

export function BillsTable({
  bills: initialBills,
  properties,
}: {
  bills: BillRow[]
  properties: PropertyOption[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payTarget, setPayTarget] = useState<'single' | 'bulk'>('single')
  const [payBillId, setPayBillId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Create form
  const [form, setForm] = useState({
    propertyId: '',
    vendorName: '',
    invoiceNumber: '',
    billDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    notes: '',
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()])

  // Pay form
  const [payForm, setPayForm] = useState({
    paidDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'check',
    paymentReference: '',
  })

  const filtered = useMemo(() => {
    let list = initialBills
    if (tab !== 'all') list = list.filter(b => b.status === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.property.addressLine1.toLowerCase().includes(q) ||
        b.vendorName?.toLowerCase().includes(q) ||
        b.invoiceNumber?.toLowerCase().includes(q)
      )
    }
    return list
  }, [initialBills, tab, search])

  // KPI calculations
  const needsReviewAmt = initialBills.filter(b => ['received', 'under_review'].includes(b.status)).reduce((s, b) => s + b.totalAmount, 0)
  const needsReviewCount = initialBills.filter(b => ['received', 'under_review'].includes(b.status)).length
  const approvedAmt = initialBills.filter(b => b.status === 'approved').reduce((s, b) => s + b.totalAmount, 0)
  const approvedCount = initialBills.filter(b => b.status === 'approved').length
  const now = new Date()
  const paidThisMonth = initialBills
    .filter(b => {
      if (b.status !== 'paid' || !b.paidDate) return false
      const d = new Date(b.paidDate)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((s, b) => s + b.totalAmount, 0)

  const totalLineItems = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(b => b.id)))
    }
  }

  function addLineItem() {
    setLineItems(li => [...li, { ...emptyLineItem(), sortOrder: li.length }])
  }

  function removeLineItem(i: number) {
    setLineItems(li => li.filter((_, idx) => idx !== i))
  }

  function updateLineItem(i: number, field: string, value: unknown) {
    setLineItems(li => li.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  async function createBill() {
    if (!form.propertyId || !form.billDate || lineItems.every(li => !li.description)) {
      toast.error('Property, bill date, and at least one line item with a description are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dueDate: form.dueDate || null,
          lineItems: lineItems.filter(li => li.description.trim()),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Bill created')
      setCreateOpen(false)
      setForm({ propertyId: '', vendorName: '', invoiceNumber: '', billDate: new Date().toISOString().slice(0, 10), dueDate: '', notes: '' })
      setLineItems([emptyLineItem()])
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create bill')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(billId: string, status: string) {
    const res = await fetch(`/api/bills/${billId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error('Failed to update'); return }
    toast.success(`Bill marked ${STATUS_LABEL[status] ?? status}`)
    router.refresh()
  }

  async function deleteBill(billId: string) {
    if (!confirm('Delete this bill? This cannot be undone.')) return
    const res = await fetch(`/api/bills/${billId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error((await res.json()).error ?? 'Failed to delete'); return }
    toast.success('Bill deleted')
    router.refresh()
  }

  function openPaySingle(billId: string) {
    setPayBillId(billId)
    setPayTarget('single')
    setPayForm({ paidDate: new Date().toISOString().slice(0, 10), paymentMethod: 'check', paymentReference: '' })
    setPayOpen(true)
  }

  function openPayBulk() {
    setPayTarget('bulk')
    setPayBillId(null)
    setPayForm({ paidDate: new Date().toISOString().slice(0, 10), paymentMethod: 'check', paymentReference: '' })
    setPayOpen(true)
  }

  async function submitPay() {
    setSaving(true)
    try {
      if (payTarget === 'single' && payBillId) {
        const res = await fetch(`/api/bills/${payBillId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid', ...payForm }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success('Bill marked paid — expenses auto-created')
      } else {
        const res = await fetch('/api/bills/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pay', billIds: Array.from(selected), ...payForm }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const { updated } = await res.json()
        toast.success(`${updated} bill${updated !== 1 ? 's' : ''} marked paid — expenses auto-created`)
        setSelected(new Set())
      }
      setPayOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function bulkApprove() {
    const res = await fetch('/api/bills/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', billIds: Array.from(selected) }),
    })
    if (!res.ok) { toast.error('Failed'); return }
    const { updated } = await res.json()
    toast.success(`${updated} bill${updated !== 1 ? 's' : ''} approved`)
    setSelected(new Set())
    router.refresh()
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">PM Bills</h1>
          <span className="text-sm text-muted-foreground">({initialBills.length})</span>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Bill
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Needs Review</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums text-amber-600">{formatCurrency(needsReviewAmt)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{needsReviewCount} bill{needsReviewCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Approved / Unpaid</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums text-blue-600">{formatCurrency(approvedAmt)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{approvedCount} bill{approvedCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Paid This Month</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums">{formatCurrency(paidThisMonth)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {STATUS_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                tab === t.value ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search property, vendor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm max-w-xs"
        />
        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={bulkApprove}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openPayBulk}>
              <CheckSquare className="h-3.5 w-3.5" /> Mark Paid
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No bills found.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-3 py-2.5 w-10">
                  <Checkbox
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Vendor</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Invoice #</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(bill => (
                <tr key={bill.id} className="hover:bg-secondary/30">
                  <td className="px-3 py-2.5">
                    <Checkbox
                      checked={selected.has(bill.id)}
                      onCheckedChange={() => toggleSelect(bill.id)}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(bill.billDate)}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/properties/${bill.property.id}`} className="text-primary hover:underline text-xs">
                      {bill.property.addressLine1}
                    </Link>
                    <div className="text-xs text-muted-foreground">{bill.property.entity.name}</div>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{bill.vendorName ?? '—'}</td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">{bill.invoiceNumber ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                      STATUS_BADGE[bill.status] ?? 'bg-secondary text-foreground border-border'
                    )}>
                      {STATUS_LABEL[bill.status] ?? bill.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatCurrency(bill.totalAmount)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/bills/${bill.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View detail">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {bill.status !== 'approved' && bill.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => updateStatus(bill.id, 'approved')}>
                              <Check className="h-3.5 w-3.5 mr-2" /> Approve
                            </DropdownMenuItem>
                          )}
                          {bill.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => openPaySingle(bill.id)}>
                              <CheckSquare className="h-3.5 w-3.5 mr-2" /> Mark Paid
                            </DropdownMenuItem>
                          )}
                          {bill.status !== 'disputed' && bill.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => updateStatus(bill.id, 'disputed')} className="text-destructive">
                              <X className="h-3.5 w-3.5 mr-2" /> Dispute
                            </DropdownMenuItem>
                          )}
                          {bill.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => deleteBill(bill.id)} className="text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Bill Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add PM Bill</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Property *</Label>
              <Select value={form.propertyId} onValueChange={v => setForm(f => ({ ...f, propertyId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select property…" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.addressLine1}{p.addressLine2 ? ` · ${p.addressLine2}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vendor / PM Name</Label>
                <Input value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} className="mt-1" placeholder="PM Name" />
              </div>
              <div>
                <Label>Invoice #</Label>
                <Input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} className="mt-1" placeholder="INV-001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bill Date *</Label>
                <Input type="date" value={form.billDate} onChange={e => setForm(f => ({ ...f, billDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="mt-1" />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items *</Label>
                <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={addLineItem}>
                  <Plus className="h-3 w-3" /> Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-start">
                    <Input
                      value={li.description}
                      onChange={e => updateLineItem(i, 'description', e.target.value)}
                      placeholder="Description"
                      className="text-xs"
                    />
                    <Select value={li.category ?? ''} onValueChange={v => updateLineItem(i, 'category', v || null)}>
                      <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      value={li.amount || ''}
                      onChange={e => updateLineItem(i, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-24 text-xs"
                    />
                    {lineItems.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeLineItem(i)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-right font-medium">
                Total: {formatCurrency(totalLineItems)}
              </p>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 resize-none" rows={2} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createBill} disabled={saving}>{saving ? 'Creating…' : 'Create Bill'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Pay Sheet */}
      <Sheet open={payOpen} onOpenChange={setPayOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Mark as Paid</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {payTarget === 'bulk'
                ? `Marking ${selected.size} bill${selected.size !== 1 ? 's' : ''} as paid. Expense records will be auto-created.`
                : 'Marking bill as paid. Expense records will be auto-created from line items.'}
            </p>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" value={payForm.paidDate} onChange={e => setPayForm(f => ({ ...f, paidDate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payForm.paymentMethod} onValueChange={v => setPayForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference # (check #, ACH ref)</Label>
              <Input value={payForm.paymentReference} onChange={e => setPayForm(f => ({ ...f, paymentReference: e.target.value }))} className="mt-1" placeholder="1234" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={submitPay} disabled={saving}>{saving ? 'Saving…' : 'Confirm Payment'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
