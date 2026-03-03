'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mockErrors, type ErrorEntry } from '@/lib/mock-errors'

const severityStyles: Record<string, { bg: string; text: string }> = {
  error:   { bg: 'bg-red-100',    text: 'text-red-700' },
  warning: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  info:    { bg: 'bg-blue-100',   text: 'text-blue-700' },
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  open:     { bg: 'bg-red-100',     text: 'text-red-700' },
  resolved: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ErrorLogViewerProps {
  standalone?: boolean
}

export function ErrorLogViewer({ standalone = false }: ErrorLogViewerProps) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')

  const counts = {
    all: mockErrors.length,
    error: mockErrors.filter((e) => e.severity === 'error').length,
    warning: mockErrors.filter((e) => e.severity === 'warning').length,
    info: mockErrors.filter((e) => e.severity === 'info').length,
  }

  const filtered =
    filter === 'all' ? mockErrors : mockErrors.filter((e) => e.severity === filter)

  const summaryCards: { key: typeof filter; label: string; count: number; color: string }[] = [
    { key: 'all',     label: 'Total',    count: counts.all,     color: 'border-blue-500' },
    { key: 'error',   label: 'Errors',   count: counts.error,   color: 'border-red-500' },
    { key: 'warning', label: 'Warnings', count: counts.warning, color: 'border-amber-500' },
    { key: 'info',    label: 'Info',      count: counts.info,    color: 'border-blue-400' },
  ]

  return (
    <div>
      {standalone && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Error Log</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Monitor and manage system errors, warnings, and events.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {summaryCards.map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg border-2 bg-white p-4 text-left transition-all cursor-pointer ${
              filter === key ? color : 'border-transparent'
            }`}
            style={{ boxShadow: filter === key ? undefined : '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${
              filter === key ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {count}
            </p>
          </button>
        ))}
      </div>

      {/* Error list */}
      <div className="space-y-2">
        {filtered.map((err) => (
          <ErrorRow key={err.id} error={err} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No entries found.</p>
        )}
      </div>
    </div>
  )
}

function ErrorRow({ error }: { error: ErrorEntry }) {
  const sev = severityStyles[error.severity]
  const stat = statusStyles[error.status]

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
      {/* Severity badge */}
      <span
        className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sev.bg} ${sev.text}`}
      >
        {error.severity}
      </span>

      {/* Message */}
      <span className="flex-1 text-sm text-gray-800 truncate">{error.message}</span>

      {/* Source */}
      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
        {error.source}
      </span>

      {/* Timestamp */}
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {formatTimestamp(error.timestamp)}
      </span>

      {/* Status */}
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stat.bg} ${stat.text}`}
      >
        {error.status === 'open' ? 'Open' : 'Resolved'}
      </span>
    </div>
  )
}
