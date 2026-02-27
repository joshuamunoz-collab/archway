'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Check, CheckSquare, X, Send } from 'lucide-react'
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
import { formatCurrency, formatDate } from '@/lib/format'
import { getCategoryLabel, getSubcategoryLabel } from '@/lib/expense-categories'
import { cn } from '@/lib/utils'

interface LineItem {
  id: string
  description: string
  category: string | null
  subcategory: string | null
  amount: number
  sortOrder: number
}

interface Message {
  id: string
  userId: string
  user: { id: string; fullName: string }
  message: string
  createdAt: string
}

interface BillDetailData {
  id: string
  propertyId: string
  property: {
    id: string
    addressLine1: string
    addressLine2: string | null
    entity: { id: string; name: string; pmFeePct: number }
  }
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
  messages: Message[]
}

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

export function BillDetail({ bill }: { bill: BillDetailData }) {
  const router = useRouter()
  const [payOpen, setPayOpen] = useState(false)
  const [payForm, setPayForm] = useState({
    paidDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'check',
    paymentReference: '',
  })
  const [message, setMessage] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [actioning, setActioning] = useState(false)

  async function updateStatus(status: string) {
    setActioning(true)
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Bill ${STATUS_LABEL[status] ?? status}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setActioning(false)
    }
  }

  async function submitPay() {
    setActioning(true)
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', ...payForm }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Bill marked paid — expenses auto-created')
      setPayOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setActioning(false)
    }
  }

  async function sendMessage() {
    if (!message.trim()) return
    setSendingMsg(true)
    try {
      const res = await fetch(`/api/bills/${bill.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMessage('')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSendingMsg(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/bills" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All Bills
      </Link>

      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-semibold">
                  {bill.vendorName ?? 'PM Bill'}
                </CardTitle>
                <span className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                  STATUS_BADGE[bill.status] ?? 'bg-secondary text-foreground border-border'
                )}>
                  {STATUS_LABEL[bill.status] ?? bill.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                <Link href={`/properties/${bill.property.id}`} className="text-primary hover:underline">
                  {bill.property.addressLine1}
                </Link>
                {' · '}{bill.property.entity.name}
              </p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(bill.totalAmount)}</p>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Field label="Bill Date" value={formatDate(bill.billDate)} />
            <Field label="Due Date" value={bill.dueDate ? formatDate(bill.dueDate) : '—'} />
            <Field label="Invoice #" value={bill.invoiceNumber ?? '—'} />
            {bill.approver && <Field label="Approved By" value={bill.approver.fullName} />}
            {bill.approvedAt && <Field label="Approved At" value={formatDate(bill.approvedAt)} />}
            {bill.paidDate && <Field label="Paid Date" value={formatDate(bill.paidDate)} />}
            {bill.paymentMethod && <Field label="Payment Method" value={bill.paymentMethod} />}
            {bill.paymentReference && <Field label="Reference #" value={bill.paymentReference} />}
          </dl>
          {bill.notes && (
            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">{bill.notes}</div>
          )}

          {/* Actions */}
          {bill.status !== 'paid' && (
            <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t">
              {['received', 'under_review'].includes(bill.status) && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateStatus('approved')} disabled={actioning}>
                  <Check className="h-3.5 w-3.5" /> Approve
                </Button>
              )}
              {['received', 'under_review', 'approved'].includes(bill.status) && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPayOpen(true)}>
                  <CheckSquare className="h-3.5 w-3.5" /> Mark Paid
                </Button>
              )}
              {!['disputed', 'paid'].includes(bill.status) && (
                <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => updateStatus('disputed')} disabled={actioning}>
                  <X className="h-3.5 w-3.5" /> Dispute
                </Button>
              )}
              {bill.status === 'disputed' && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateStatus('under_review')} disabled={actioning}>
                  Back to Review
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bill.lineItems.map(li => (
                <tr key={li.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-2.5">{li.description}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                    {li.category ? getCategoryLabel(li.category) : '—'}
                    {li.subcategory && <span> / {getSubcategoryLabel(li.category!, li.subcategory)}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatCurrency(li.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-secondary">
              <tr>
                <td className="px-4 py-2.5 text-xs font-semibold" colSpan={2}>Total</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatCurrency(bill.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Message thread */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Notes / Dispute Thread</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bill.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            bill.messages.map(m => (
              <div key={m.id} className="rounded-md bg-secondary p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{m.user.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm">{m.message}</p>
              </div>
            ))
          )}
          <div className="flex gap-2 pt-1">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a note or dispute message…"
              className="resize-none text-sm"
              rows={2}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendMessage()
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="self-end gap-1.5"
              onClick={sendMessage}
              disabled={sendingMsg || !message.trim()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pay Sheet */}
      <Sheet open={payOpen} onOpenChange={setPayOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Mark as Paid</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Expense records will be auto-created from each line item.
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
            <Button onClick={submitPay} disabled={actioning}>{actioning ? 'Saving…' : 'Confirm Payment'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground font-medium">{label}</dt>
      <dd className="text-sm mt-0.5">{value}</dd>
    </div>
  )
}
