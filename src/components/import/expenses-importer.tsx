'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { Upload, Download, CheckCircle2, XCircle, AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories'
import { cn } from '@/lib/utils'

const VALID_CATEGORIES = EXPENSE_CATEGORIES.map(c => c.value)
const TEMPLATE = `date,property_address,amount,category,subcategory,vendor,description\n2025-02-05,"1815 Arsenal St",250.00,maintenance_repairs,plumbing,"ABC Plumbing","Fixed leaking pipe"\n2025-02-10,"1815 Arsenal St",120.00,utilities,,,`

type Step = 'upload' | 'preview' | 'importing' | 'done'
type ParsedRow = { [key: string]: string | string[] } & { _errors: string[] }

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'expenses_template.csv'
  a.click()
}

function validateRow(row: Record<string, string>): string[] {
  const errors: string[] = []
  if (!row.date?.trim()) errors.push('date required')
  if (!row.property_address?.trim()) errors.push('property_address required')
  if (!row.amount || isNaN(parseFloat(row.amount))) errors.push('amount must be a number')
  if (!VALID_CATEGORIES.includes(row.category?.trim())) errors.push('invalid category')
  return errors
}

export function ExpensesImporter() {
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [results, setResults] = useState<{ ok: boolean; message: string }[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const validRows = rows.filter(r => r._errors.length === 0)
  const errorRows = rows.filter(r => r._errors.length > 0)

  function parseFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
      setRows(result.data.map(raw => ({ ...raw, _errors: validateRow(raw) }) as ParsedRow))
      setStep('preview')
    }
    reader.readAsText(file)
  }

  async function runImport() {
    setStep('importing')
    const res = await fetch('/api/import/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: validRows.map(r => { const { _errors, ...rest } = r; void _errors; return rest }) }),
    })
    const data = await res.json()
    setResults(data.results ?? [])
    setStep('done')
  }

  function reset() { setStep('upload'); setRows([]); setResults([]) }

  if (step === 'upload') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div
            className={cn('border-2 border-dashed rounded-xl p-10 text-center transition-colors', dragOver ? 'border-primary bg-primary/5' : 'border-border')}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Drag & drop your expenses CSV</p>
            <p className="text-xs text-muted-foreground mt-1">or</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => fileRef.current?.click()}>Choose File</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f) }} />
          </div>
          <div className="mt-4 flex justify-center">
            <Button size="sm" variant="ghost" onClick={downloadTemplate} className="gap-1.5 text-xs text-muted-foreground">
              <Download className="h-3.5 w-3.5" /> Download Template
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Valid categories: {VALID_CATEGORIES.join(', ')}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'preview') {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm"><span className="font-semibold text-emerald-600">{validRows.length}</span> valid</span>
            {errorRows.length > 0 && <span className="text-sm"><span className="font-semibold text-red-600">{errorRows.length}</span> errors</span>}
            <Button size="sm" variant="ghost" onClick={reset} className="gap-1 text-xs ml-auto"><RotateCcw className="h-3.5 w-3.5" /> Start Over</Button>
          </div>
          {errorRows.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> {errorRows.length} rows will be skipped</p>
              {errorRows.slice(0, 5).map((r, i) => <p key={i} className="text-xs text-red-600">{r.property_address || `Row ${i + 1}`}: {r._errors.join('; ')}</p>)}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary"><tr>
                {['date', 'property_address', 'amount', 'category', 'vendor'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}
                <th className="px-3 py-2" />
              </tr></thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className={r._errors.length > 0 ? 'bg-red-50' : ''}>
                    {['date', 'property_address', 'amount', 'category', 'vendor'].map(h => <td key={h} className="px-3 py-2">{r[h] ?? ''}</td>)}
                    <td className="px-3 py-2">{r._errors.length > 0 ? <XCircle className="h-3.5 w-3.5 text-red-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && <p className="text-xs text-muted-foreground mt-2 pl-3">…and {rows.length - 10} more</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={reset}>Cancel</Button>
            <Button size="sm" onClick={runImport} disabled={validRows.length === 0}>
              Import {validRows.length} Expense{validRows.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'importing') return <Card><CardContent className="py-10 text-center"><p className="text-sm text-muted-foreground">Importing…</p></CardContent></Card>

  const succeeded = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold">{succeeded} expenses imported</p>
            {failed > 0 && <p className="text-xs text-red-600">{failed} failed</p>}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={reset} className="gap-1"><RotateCcw className="h-3.5 w-3.5" /> Import More</Button>
      </CardContent>
    </Card>
  )
}
