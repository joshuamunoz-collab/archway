'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
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
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories'
import type { PropertyDetailData } from '@/types/property'
import { cn } from '@/lib/utils'

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  hap: 'HAP',
  copay: 'Copay',
  other_income: 'Other',
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  overdue:  'bg-red-50 text-red-700 border-red-200',
  nsf:      'bg-red-50 text-red-700 border-red-200',
}

const EMPTY_PAYMENT = { date: '', type: 'hap', amount: '', status: 'received', referenceNumber: '', notes: '' }
const EMPTY_EXPENSE = { date: '', category: '', subcategory: '', amount: '', vendor: '', description: '', notes: '' }

export function FinancialsTab({ data }: { data: PropertyDetailData }) {
  const router = useRouter()
  const { recentPayments, recentExpenses, ytdIncome, ytdExpenses, mtdIncome, monthlyChartData, expenseByCategoryData } = data

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT)
  const [savingPayment, setSavingPayment] = useState(false)

  const [expenseOpen, setExpenseOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE)
  const [savingExpense, setSavingExpense] = useState(false)

  const selectedCat = EXPENSE_CATEGORIES.find(c => c.value === expenseForm.category)

  function openRecordPayment() {
    setPaymentForm({ ...EMPTY_PAYMENT, date: new Date().toISOString().slice(0, 10) })
    setPaymentOpen(true)
  }

  function openAddExpense() {
    setExpenseForm({ ...EMPTY_EXPENSE, date: new Date().toISOString().slice(0, 10) })
    setExpenseOpen(true)
  }

  async function savePayment() {
    if (!paymentForm.date || !paymentForm.amount || !paymentForm.type) {
      toast.error('Date, type, and amount are required')
      return
    }
    setSavingPayment(true)
    try {
      const res = await fetch(`/api/properties/${data.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: paymentForm.date,
          amount: parseFloat(paymentForm.amount),
          type: paymentForm.type,
          status: paymentForm.status,
          leaseId: data.activeLease?.id ?? null,
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

  async function saveExpense() {
    if (!expenseForm.date || !expenseForm.amount || !expenseForm.category) {
      toast.error('Date, category, and amount are required')
      return
    }
    setSavingExpense(true)
    try {
      const res = await fetch(`/api/properties/${data.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: expenseForm.date,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          subcategory: expenseForm.subcategory || null,
          vendor: expenseForm.vendor || null,
          description: expenseForm.description || null,
          notes: expenseForm.notes || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Expense added')
      setExpenseOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expense')
    } finally {
      setSavingExpense(false)
    }
  }

  async function deletePayment(paymentId: string) {
    if (!confirm('Delete this payment? This cannot be undone.')) return
    const res = await fetch(`/api/properties/${data.id}/payments/${paymentId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete payment'); return }
    toast.success('Payment deleted')
    router.refresh()
  }

  async function deleteExpense(expenseId: string) {
    if (!confirm('Delete this expense?')) return
    const res = await fetch(`/api/properties/${data.id}/expenses/${expenseId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error((await res.json()).error ?? 'Failed to delete'); return }
    toast.success('Expense deleted')
    router.refresh()
  }

  const ytdNoi = ytdIncome - ytdExpenses

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="YTD Income" value={formatCurrency(ytdIncome)} />
        <SummaryCard label="YTD Expenses" value={formatCurrency(ytdExpenses)} />
        <SummaryCard label="YTD NOI" value={formatCurrency(ytdNoi)} negative={ytdNoi < 0} />
        <SummaryCard label="MTD Income" value={formatCurrency(mtdIncome)} />
      </div>

      {/* Charts row */}
      {monthlyChartData.some(d => d.income > 0 || d.expenses > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Income vs Expenses line chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Income vs. Expenses (12 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthlyChartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : ''} contentStyle={{ fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={false} name="Income" />
                  <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} dot={false} name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense by category bar chart */}
          {expenseByCategoryData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Expenses by Category (YTD)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={expenseByCategoryData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} tickLine={false} width={110} />
                    <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : ''} contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="amount" fill="#2563EB" radius={[0, 3, 3, 0]} name="Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Income ledger */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold">Income</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Last 50 transactions</span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openRecordPayment}>
              <Plus className="h-3.5 w-3.5" /> Record Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentPayments.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1 text-xs" onClick={openRecordPayment}>
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
        <CardHeader className="pb-2 flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold">Expenses</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Last 50 transactions</span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openAddExpense}>
              <Plus className="h-3.5 w-3.5" /> Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentExpenses.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1 text-xs" onClick={openAddExpense}>
                <Plus className="h-3.5 w-3.5" /> Add First Expense
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Vendor</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Source</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-secondary/30 group">
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(e.date)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{e.category.replace(/_/g, ' ')}</span>
                      {e.subcategory && (
                        <span className="text-muted-foreground"> / {e.subcategory.replace(/_/g, ' ')}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{e.vendor ?? '—'}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {e.source === 'pm_bill' && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 text-xs">PM Bill</span>
                      )}
                      {e.source === 'auto_pm_fee' && (
                        <span className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200 text-purple-700 px-1.5 py-0.5 text-xs">PM Fee</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatCurrency(e.amount)}</td>
                    <td className="px-2 py-2.5">
                      {e.source === 'manual' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={() => deleteExpense(e.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
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
          <SheetHeader><SheetTitle>Record Payment</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={paymentForm.date} onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Payment Type *</Label>
              <Select value={paymentForm.type} onValueChange={v => setPaymentForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hap">HAP (Housing Assistance Payment)</SelectItem>
                  <SelectItem value="copay">Tenant Copay</SelectItem>
                  <SelectItem value="other_income">Other Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={paymentForm.status} onValueChange={v => setPaymentForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <Input value={paymentForm.referenceNumber} onChange={e => setPaymentForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="Check #, ACH ref…" className="mt-1" />
            </div>
            {data.activeLease && (
              <p className="text-xs text-muted-foreground">
                Linked to {data.activeLease.tenant.firstName} {data.activeLease.tenant.lastName}.
                {['hap', 'copay'].includes(paymentForm.type) && ` PM fee (${data.entity.pmFeePct}%) will be auto-created.`}
              </p>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={savePayment} disabled={savingPayment}>{savingPayment ? 'Saving…' : 'Record Payment'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Expense Sheet */}
      <Sheet open={expenseOpen} onOpenChange={setExpenseOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Expense</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={expenseForm.category} onValueChange={v => setExpenseForm(f => ({ ...f, category: v, subcategory: '' }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedCat && selectedCat.subcategories.length > 0 && (
              <div>
                <Label>Subcategory</Label>
                <Select value={expenseForm.subcategory} onValueChange={v => setExpenseForm(f => ({ ...f, subcategory: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select subcategory…" /></SelectTrigger>
                  <SelectContent>
                    {selectedCat.subcategories.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Amount *</Label>
              <Input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="mt-1" />
            </div>
            <div>
              <Label>Vendor</Label>
              <Input value={expenseForm.vendor} onChange={e => setExpenseForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Vendor name" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" className="mt-1" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
            <Button onClick={saveExpense} disabled={savingExpense}>{savingExpense ? 'Saving…' : 'Add Expense'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SummaryCard({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={cn('text-xl font-bold mt-0.5 tabular-nums', negative ? 'text-red-600' : 'text-foreground')}>{value}</p>
      </CardContent>
    </Card>
  )
}
