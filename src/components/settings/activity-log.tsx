'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/format'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface LogEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  details: Record<string, unknown> | null
  createdAt: string
  user: { fullName: string | null; email: string } | null
}

const ENTITY_TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'property', label: 'Property' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'lease', label: 'Lease' },
  { value: 'payment', label: 'Payment' },
  { value: 'expense', label: 'Expense' },
  { value: 'task', label: 'Task' },
  { value: 'pm_bill', label: 'PM Bill' },
  { value: 'rehab', label: 'Rehab' },
  { value: 'inspection', label: 'Inspection' },
]

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function actionColor(action: string): string {
  if (action.includes('create') || action.includes('add')) return 'text-emerald-600'
  if (action.includes('delete') || action.includes('remove')) return 'text-red-600'
  if (action.includes('update') || action.includes('change') || action.includes('status')) return 'text-blue-600'
  return 'text-muted-foreground'
}

export function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [entityType, setEntityType] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (entityType !== 'all') params.set('entityType', entityType)
    const res = await fetch(`/api/activity?${params}`)
    const data = await res.json()
    setLogs(data.logs ?? [])
    setTotal(data.total ?? 0)
    setPages(data.pages ?? 1)
    setLoading(false)
  }, [page, entityType])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  function handleTypeChange(val: string) {
    setEntityType(val)
    setPage(1)
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between flex-wrap gap-3">
        <div>
          <CardTitle className="text-base">Activity Log</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{total.toLocaleString()} total entries</p>
        </div>
        <Select value={entityType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No activity found</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-3 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${actionColor(log.action)}`}>
                        {actionLabel(log.action)}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{log.entityType}</span>
                    </div>
                    {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {Object.entries(log.details as Record<string, unknown>)
                          .filter(([, v]) => v !== null && v !== undefined && v !== '')
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                    {log.user && (
                      <p className="text-xs text-muted-foreground">{log.user.fullName ?? log.user.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">Page {page} of {pages}</p>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    disabled={page >= pages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
