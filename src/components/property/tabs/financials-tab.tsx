'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
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
import { formatCurrency, formatDate } from '@/lib/format'
import type { PropertyDetailData } from '@/types/property'
import { cn } from '@/lib/utils'

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  hap: 'HAP',
  copay: 'Copay',
  other_income: 'Other',
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  nsf: 'bg-red-50 text-red-700 border-red-200',
}

const EMPTY_PAYMENT = {
  date: '',
  type: 'hap',
  amount: '',
  status: 'received',
  referenceNumber: '',
  notes: '',
}

export function FinancialsTab({ data }: { data: PropertyDetailData }) {
  const router = useRouter()
  const { recentPayments, recentExpenses, ytdIncome, ytdExpenses, mtdIncome, mtdExpenses } = data

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT)
  const [savingPayment, setSavingPayment] = useState(false)

  function openRecordPayment() {
    setPaymentForm({
      ...EMPTY_PAYMENT,
      date: new Date().toISOString().slice(0, 10),
    })
    setPaymentOpen(true)
  }

  async function savePayment() {
    if (!paymentForm.date || !paymentForm.amount || !paymentForm.type) {
      toast.error('Date, type, and amount are required')
      return
    }
    setSavingPayment(true)
    try {
      const leaseId = data.activeLease?.id ?? null
      const res = await fetch(`/api/properties/${data.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: paymentForm.date,
          amount: parseFloat(paymentForm.amount),
          type: paymentForm.type,
          status: paymentForm.status,
          leaseId,
          referenceNumber: paymentForm.referenceNumber || null,
          notes: paymentForm.notes || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Payment recorded')
      setPaymentOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setSavingPayment(false)
    }
  }

  async function deletePayment(paymentId: string) {
    if (!confirm('Delete this payment? This cannot be undone.')) return
    const res = await fetch(`/api/properties/${data.id}/payments/${paymentId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete payment'); return }
    toast.success('Payment deleted')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="YTD Income" value={formatCurrency(ytdIncome)} />
        <SummaryCard label="YTD Expenses" value={formatCurrency(ytdExpenses)} />
        <SummaryCard
          label="YTD NOI"
          value={formatCurrency(ytdIncome - ytdExpenses)}
          negative={ytdIncome - ytdExpenses < 0}
        />
        <SummaryCard label="MTD Income" value={formatCurrency(mtdIncome)} />
      </div>

      {/* Income ledger */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold">Income</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Last 20 transactions</span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openRecordPayment}>
              <Plus className="h-3.5 w-3.5" /> Record Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentPayments.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-1 text-xs"
                onClick={openRecordPayment}
              >
                <Plus className="h-3.5 w-3.5" /> Record First Payment
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPayments.map(p => (
                  <tr key={p.id} className="hover:bg-secondary/30 group">
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(p.date)}</td>
                    <td className="px-4 py-2.5">{PAYMENT_TYPE_LABEL[p.type] ?? p.type}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        PAYMENT_STATUS_COLOR[p.status] ?? 'bg-secondary text-foreground border-border'
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatCurrency(p.amount)}</td>
                    <td className="px-2 py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => deletePayment(p.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Expense ledger */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Expenses</CardTitle>
          <span className="text-xs text-muted-foreground">Last 20 transactions</span>
        </CardHeader>
        <CardContent className="p-0">
          {recentExpenses.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No expenses recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Vendor</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(e.date)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{e.category.replace(/_/g, ' ')}</span>
                      {e.subcategory && (
                        <span className="text-muted-foreground"> / {e.subcategory}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.vendor ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Sheet */}
      <Sheet open={paymentOpen} onOpenChange={setPaymentOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Record Payment</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={paymentForm.date}
                onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Payment Type *</Label>
              <Select value={paymentForm.type} onValueChange={v => setPaymentForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hap">HAP (Housing Assistance Payment)</SelectItem>
                  <SelectItem value="copay">Tenant Copay</SelectItem>
                  <SelectItem value="other_income">Other Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={paymentForm.status} onValueChange={v => setPaymentForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="nsf">NSF (Bounced)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input
                value={paymentForm.referenceNumber}
                onChange={e => setPaymentForm(f => ({ ...f, referenceNumber: e.target.value }))}
                placeholder="Check #, ACH ref, etc."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={paymentForm.notes}
                onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
                className="mt-1"
              />
            </div>
            {data.activeLease && (
              <p className="text-xs text-muted-foreground">
                Will be linked to active lease for {data.activeLease.tenant.firstName} {data.activeLease.tenant.lastName}.
              </p>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={savePayment} disabled={savingPayment}>
              {savingPayment ? 'Saving…' : 'Record Payment'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  negative,
}: {
  label: string
  value: string
  negative?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={cn('text-xl font-bold mt-0.5 tabular-nums', negative ? 'text-red-600' : 'text-foreground')}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
