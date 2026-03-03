import { useState } from 'react'
import { RefreshCw, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { mockErrors } from '../data/mockErrors'

const severityConfig = {
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: AlertCircle },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: AlertTriangle },
  info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: Info },
}

const statusConfig = {
  open: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Open' },
  resolved: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Resolved' },
}

function formatTimestamp(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ErrorLog({ embedded = false }) {
  const [filter, setFilter] = useState('all')

  const counts = {
    all: mockErrors.length,
    error: mockErrors.filter((e) => e.severity === 'error').length,
    warning: mockErrors.filter((e) => e.severity === 'warning').length,
    info: mockErrors.filter((e) => e.severity === 'info').length,
  }

  const filtered =
    filter === 'all' ? mockErrors : mockErrors.filter((e) => e.severity === filter)

  const summaryCards = [
    { key: 'all', label: 'Total', count: counts.all, color: '#4f6ef7' },
    { key: 'error', label: 'Errors', count: counts.error, color: '#ef4444' },
    { key: 'warning', label: 'Warnings', count: counts.warning, color: '#f59e0b' },
    { key: 'info', label: 'Info', count: counts.info, color: '#3b82f6' },
  ]

  if (embedded) {
    return (
      <div>
        {/* Filter pills */}
        <div className="flex gap-2 mb-4">
          {summaryCards.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer"
              style={{
                background:
                  filter === key ? 'rgba(79,110,247,0.15)' : 'rgba(255,255,255,0.05)',
                color: filter === key ? '#8ba3f9' : '#6b7280',
                border:
                  filter === key
                    ? '1px solid rgba(79,110,247,0.3)'
                    : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Error list */}
        <div className="flex flex-col gap-2">
          {filtered.map((err) => (
            <ErrorEntry key={err.id} error={err} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#f0f1f4' }}>
            Error Log
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
            Monitor and manage system errors, warnings, and events.
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
          style={{
            background: 'rgba(79,110,247,0.1)',
            color: '#8ba3f9',
            border: '1px solid rgba(79,110,247,0.2)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(79,110,247,0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(79,110,247,0.1)')}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {summaryCards.map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="rounded-xl p-4 text-left transition-all duration-150 cursor-pointer"
            style={{
              background:
                filter === key
                  ? `${color}15`
                  : 'rgba(255,255,255,0.03)',
              border:
                filter === key
                  ? `1px solid ${color}40`
                  : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="text-xs font-medium mb-1" style={{ color: '#6b7280' }}>
              {label}
            </div>
            <div className="text-2xl font-semibold" style={{ color: filter === key ? color : '#f0f1f4' }}>
              {count}
            </div>
          </button>
        ))}
      </div>

      {/* Error list */}
      <div className="mt-6 flex flex-col gap-2">
        {filtered.map((err) => (
          <ErrorEntry key={err.id} error={err} />
        ))}
      </div>
    </div>
  )
}

function ErrorEntry({ error }) {
  const sev = severityConfig[error.severity]
  const stat = statusConfig[error.status]

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-4 transition-all duration-150"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Severity badge */}
      <span
        className="px-2 py-0.5 rounded font-semibold uppercase flex-shrink-0"
        style={{
          fontSize: 10,
          letterSpacing: '0.05em',
          background: sev.bg,
          color: sev.color,
        }}
      >
        {error.severity}
      </span>

      {/* Message */}
      <span className="flex-1 text-sm" style={{ color: '#e1e4ea' }}>
        {error.message}
      </span>

      {/* Source */}
      <span
        className="px-2 py-0.5 rounded text-xs flex-shrink-0"
        style={{
          background: 'rgba(255,255,255,0.06)',
          color: '#6b7280',
        }}
      >
        {error.source}
      </span>

      {/* Timestamp */}
      <span className="text-xs flex-shrink-0" style={{ color: '#4b5563' }}>
        {formatTimestamp(error.timestamp)}
      </span>

      {/* Status */}
      <span
        className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
        style={{
          background: stat.bg,
          color: stat.color,
        }}
      >
        {stat.label}
      </span>
    </div>
  )
}
