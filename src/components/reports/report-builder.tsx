'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, FileText, Table } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { downloadCsv, downloadXlsx } from '@/lib/export'

const REPORT_TYPES = [
  {
    key: 'rent_roll',
    label: 'Rent Roll',
    description: 'All active leases with HAP, copay, and tenant info',
    icon: Table,
  },
  {
    key: 'portfolio_pl',
    label: 'Portfolio P&L',
    description: 'Income vs. expenses per property for a date range',
    icon: FileSpreadsheet,
  },
  {
    key: 'entity_pl',
    label: 'Entity P&L',
    description: 'Income vs. expenses grouped by owning entity',
    icon: FileSpreadsheet,
  },
  {
    key: 'vacancy',
    label: 'Vacancy Report',
    description: 'All vacant, rehab, and pending properties with days vacant',
    icon: Table,
  },
  {
    key: 'tax_summary',
    label: 'Tax Summary',
    description: 'Property taxes, assessed values, and payment status',
    icon: Table,
  },
  {
    key: 'city_notices',
    label: 'Outstanding City Notices',
    description: 'All open compliance and code notices',
    icon: FileText,
  },
  {
    key: 'pm_performance',
    label: 'PM Performance',
    description: 'Task completion rates and response times',
    icon: FileText,
  },
]

export function ReportBuilder({ entities }: { entities: { id: string; name: string }[] }) {
  const now = new Date()
  const ytdStart = `${now.getFullYear()}-01-01`
  const todayStr = now.toISOString().split('T')[0]

  const [selectedType, setSelectedType] = useState('rent_roll')
  const [entityFilter, setEntityFilter] = useState('all')
  const [startDate, setStartDate] = useState(ytdStart)
  const [endDate, setEndDate] = useState(todayStr)
  const [loading, setLoading] = useState<string | null>(null)

  const needsDateRange = ['portfolio_pl', 'entity_pl'].includes(selectedType)

  async function fetchReportData() {
    const params = new URLSearchParams({ type: selectedType })
    if (entityFilter !== 'all') params.set('entityId', entityFilter)
    if (needsDateRange) {
      params.set('startDate', startDate)
      params.set('endDate', endDate)
    }

    const res = await fetch(`/api/reports?${params}`)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Failed to fetch report')
    }
    return res.json()
  }

  async function downloadAs(format: 'csv' | 'xlsx') {
    setLoading(format)
    try {
      const { rows } = await fetchReportData()
      if (!rows || rows.length === 0) {
        toast.info('No data to export for the selected filters')
        return
      }
      const report = REPORT_TYPES.find(r => r.key === selectedType)!
      const filename = `${report.label.replace(/[^a-z0-9]/gi, '_')}_${todayStr}`
      if (format === 'csv') {
        downloadCsv(`${filename}.csv`, rows)
      } else {
        downloadXlsx(`${filename}.xlsx`, rows, report.label)
      }
      toast.success(`${format.toUpperCase()} downloaded`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Report type selector */}
      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Select Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REPORT_TYPES.map(report => {
            const Icon = report.icon
            const isSelected = selectedType === report.key
            return (
              <button
                key={report.key}
                onClick={() => setSelectedType(report.key)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border hover:border-primary/40 hover:bg-secondary/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${isSelected ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{report.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Options panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Report Options</CardTitle>
            <CardDescription className="text-xs">
              {REPORT_TYPES.find(r => r.key === selectedType)?.label}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Entity filter */}
            <div>
              <Label className="text-xs">Entity</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            {needsDateRange && (
              <>
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </>
            )}

            <div className="border-t pt-4 space-y-2">
              <Button
                className="w-full gap-2"
                size="sm"
                onClick={() => downloadAs('xlsx')}
                disabled={loading !== null}
              >
                <FileSpreadsheet className="h-4 w-4" />
                {loading === 'xlsx' ? 'Generating…' : 'Download Excel (.xlsx)'}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                size="sm"
                onClick={() => downloadAs('csv')}
                disabled={loading !== null}
              >
                <Download className="h-4 w-4" />
                {loading === 'csv' ? 'Generating…' : 'Download CSV'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium mb-2">Quick Exports</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>• Use the table views in Properties, Tenants, Bills, and Tasks for filtered exports</p>
              <p>• All tables support CSV and Excel download</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
