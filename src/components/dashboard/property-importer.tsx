'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { Upload, Download, CheckCircle2, XCircle, AlertCircle, FileText, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'results'

interface ParsedRow {
  _rowNum: number
  address: string
  unit: string
  city: string
  state: string
  zip: string
  entity_name: string
  parcel_number: string
  type: string
  beds: string
  baths: string
  sqft: string
  year_built: string
  is_section_8: string
  status: string
  vacant_since: string
  neighborhood: string
  ward: string
  _errors: string[]
}

interface ImportResult {
  row: number
  address: string
  success: boolean
  error?: string
}

const VALID_STATUSES = ['occupied', 'vacant', 'rehab', 'pending_inspection', 'pending_packet']
const VALID_TYPES = ['single_family', 'duplex', 'multi_family', '']

function validateRow(row: ParsedRow, entityNames: string[]): string[] {
  const errors: string[] = []
  if (!row.address?.trim()) errors.push('address is required')
  if (!row.zip?.trim()) errors.push('zip is required')
  if (!row.entity_name?.trim()) errors.push('entity_name is required')
  else if (!entityNames.map(n => n.toLowerCase()).includes(row.entity_name.toLowerCase().trim())) {
    errors.push(`entity "${row.entity_name}" not found`)
  }
  const status = row.status?.trim() || 'vacant'
  if (!VALID_STATUSES.includes(status)) errors.push(`invalid status "${status}"`)
  const type = row.type?.trim()
  if (type && !VALID_TYPES.includes(type)) errors.push(`invalid type "${type}"`)
  if (row.vacant_since?.trim()) {
    const d = new Date(row.vacant_since.trim())
    if (isNaN(d.getTime())) errors.push(`invalid vacant_since date`)
  }
  return errors
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PropertyImporter({ entityNames }: { entityNames: string[] }) {
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [results, setResults] = useState<ImportResult[]>([])
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const validRows = rows.filter(r => r._errors.length === 0)
  const errorRows = rows.filter(r => r._errors.length > 0)

  function parseFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
      })

      const parsed: ParsedRow[] = result.data.map((raw, i) => {
        const row: ParsedRow = {
          _rowNum: i + 1,
          address: raw.address ?? '',
          unit: raw.unit ?? '',
          city: raw.city ?? 'St. Louis',
          state: raw.state ?? 'MO',
          zip: raw.zip ?? '',
          entity_name: raw.entity_name ?? '',
          parcel_number: raw.parcel_number ?? '',
          type: raw.type ?? '',
          beds: raw.beds ?? '',
          baths: raw.baths ?? '',
          sqft: raw.sqft ?? '',
          year_built: raw.year_built ?? '',
          is_section_8: raw.is_section_8 ?? '',
          status: raw.status ?? 'vacant',
          vacant_since: raw.vacant_since ?? '',
          neighborhood: raw.neighborhood ?? '',
          ward: raw.ward ?? '',
          _errors: [],
        }
        row._errors = validateRow(row, entityNames)
        return row
      })

      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file?.name.endsWith('.csv')) parseFile(file)
  }

  async function runImport() {
    setImporting(true)
    try {
      const payload = validRows.map(({ _rowNum, _errors, ...rest }) => rest)
      const res = await fetch('/api/import/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      })
      const data = await res.json()
      setResults(data.results ?? [])
      setStep('results')
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setStep('upload')
    setRows([])
    setResults([])
  }

  // ── Upload step ──────────────────────────────────────────────────────────

  if (step === 'upload') {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Import Properties</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Upload a CSV file to add properties in bulk.</p>
          </div>
          <a href="/templates/properties.csv" download>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1.5" />
              Download Template
            </Button>
          </a>
        </div>

        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
            dragOver ? 'border-primary bg-accent' : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          )}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">Drop your CSV here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Only .csv files are supported</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
        </div>

        <div className="mt-6 p-4 bg-secondary rounded-lg">
          <p className="text-xs font-medium text-foreground mb-1">Required columns</p>
          <p className="text-xs text-muted-foreground font-mono">
            address, zip, entity_name
          </p>
          <p className="text-xs font-medium text-foreground mt-3 mb-1">Optional columns</p>
          <p className="text-xs text-muted-foreground font-mono leading-5">
            unit, city, state, parcel_number, type, beds, baths, sqft, year_built,
            is_section_8, status, vacant_since, neighborhood, ward
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            <strong>status</strong> values: occupied · vacant · rehab · pending_inspection · pending_packet<br />
            <strong>type</strong> values: single_family · duplex · multi_family<br />
            <strong>entity_name</strong> must exactly match a name in Settings → Entities
          </p>
        </div>
      </div>
    )
  }

  // ── Preview step ─────────────────────────────────────────────────────────

  if (step === 'preview') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Preview Import</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Review your data before importing.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Start Over
            </Button>
            <Button
              size="sm"
              onClick={runImport}
              disabled={importing || validRows.length === 0}
            >
              {importing ? 'Importing…' : `Import ${validRows.length} row${validRows.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-3 mb-5">
          <Card className="flex-1 py-3">
            <CardContent className="px-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{rows.length} rows parsed</span>
            </CardContent>
          </Card>
          <Card className="flex-1 py-3">
            <CardContent className="px-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">{validRows.length} valid</span>
            </CardContent>
          </Card>
          {errorRows.length > 0 && (
            <Card className="flex-1 py-3">
              <CardContent className="px-4 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">{errorRows.length} with errors</span>
              </CardContent>
            </Card>
          )}
        </div>

        {errorRows.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-medium text-red-700 mb-1.5 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Rows with errors will be skipped during import
            </p>
            <div className="space-y-1">
              {errorRows.map(r => (
                <p key={r._rowNum} className="text-xs text-red-600">
                  Row {r._rowNum} ({r.address || 'no address'}): {r._errors.join(' · ')}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Address</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Entity</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Sec 8</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Bed/Bath</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Valid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => (
                <tr key={row._rowNum} className={row._errors.length > 0 ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2 text-muted-foreground">{row._rowNum}</td>
                  <td className="px-3 py-2 font-medium">
                    {row.address || <span className="text-destructive italic">missing</span>}
                    {row.unit && <span className="text-muted-foreground"> {row.unit}</span>}
                  </td>
                  <td className="px-3 py-2">{row.entity_name || '—'}</td>
                  <td className="px-3 py-2">{row.status || 'vacant'}</td>
                  <td className="px-3 py-2">{row.type || '—'}</td>
                  <td className="px-3 py-2">{row.is_section_8?.toLowerCase() === 'true' ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">
                    {row.beds || '—'}/{row.baths || '—'}
                  </td>
                  <td className="px-3 py-2">
                    {row._errors.length === 0
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      : <XCircle className="h-3.5 w-3.5 text-destructive" />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Results step ─────────────────────────────────────────────────────────

  const succeeded = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Import Complete</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {succeeded.length} imported · {failed.length} failed
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Import Another File
        </Button>
      </div>

      {succeeded.length > 0 && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm font-medium text-emerald-700 flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            {succeeded.length} propert{succeeded.length === 1 ? 'y' : 'ies'} imported successfully
          </p>
          <div className="space-y-0.5">
            {succeeded.map(r => (
              <p key={r.row} className="text-xs text-emerald-600">{r.address}</p>
            ))}
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-700 flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4" />
            {failed.length} row{failed.length === 1 ? '' : 's'} failed
          </p>
          <div className="space-y-1">
            {failed.map(r => (
              <p key={r.row} className="text-xs text-red-600">
                Row {r.row} ({r.address}): {r.error}
              </p>
            ))}
          </div>
        </div>
      )}

      {succeeded.length > 0 && (
        <div className="mt-5">
          <Separator className="mb-5" />
          <a href="/properties">
            <Button>View Properties</Button>
          </a>
        </div>
      )}
    </div>
  )
}
