'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, Users, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResults {
  properties: {
    id: string
    addressLine1: string
    addressLine2: string | null
    status: string
    neighborhood: string | null
  }[]
  tenants: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
    email: string | null
  }[]
  tasks: {
    id: string
    title: string
    status: string
    priority: string
  }[]
}

const STATUS_COLORS: Record<string, string> = {
  occupied: 'bg-emerald-100 text-emerald-800',
  vacant: 'bg-red-100 text-red-800',
  rehab: 'bg-orange-100 text-orange-800',
  pending_inspection: 'bg-amber-100 text-amber-800',
  pending_packet: 'bg-amber-100 text-amber-800',
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Build flat list of navigable results for keyboard nav
  const flatItems = useCallback(() => {
    if (!results) return []
    const items: { type: string; href: string }[] = []
    results.properties.forEach(p => items.push({ type: 'property', href: `/properties/${p.id}` }))
    results.tenants.forEach(t => items.push({ type: 'tenant', href: `/tenants` }))
    results.tasks.forEach(t => items.push({ type: 'task', href: `/tasks/${t.id}` }))
    return items
  }, [results])

  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }

    setLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          const hasResults = data.properties.length > 0 || data.tenants.length > 0 || data.tasks.length > 0
          setOpen(hasResults || query.length >= 2)
        }
      } catch {
        // ignore fetch errors
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function navigate(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const items = flatItems()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0 && items[selectedIndex]) {
      e.preventDefault()
      navigate(items[selectedIndex].href)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const totalResults = results
    ? results.properties.length + results.tenants.length + results.tasks.length
    : 0

  let currentIndex = 0

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIndex(-1) }}
          onFocus={() => { if (results && totalResults > 0) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Search properties, tenants, tasks... (Ctrl+K)"
          className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-[400px] overflow-y-auto">
          {totalResults === 0 && !loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Properties */}
          {results && results.properties.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-gray-50 border-b flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                Properties
              </div>
              {results.properties.map(p => {
                const idx = currentIndex++
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/properties/${p.id}`)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between gap-2',
                      selectedIndex === idx && 'bg-accent'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {p.addressLine1}
                        {p.addressLine2 ? ` ${p.addressLine2}` : ''}
                      </p>
                      {p.neighborhood && (
                        <p className="text-xs text-muted-foreground">{p.neighborhood}</p>
                      )}
                    </div>
                    <span className={cn('shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium', STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-700')}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Tenants */}
          {results && results.tenants.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-gray-50 border-b border-t flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                Tenants
              </div>
              {results.tenants.map(t => {
                const idx = currentIndex++
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/tenants`)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-accent',
                      selectedIndex === idx && 'bg-accent'
                    )}
                  >
                    <p className="font-medium">{t.firstName} {t.lastName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[t.email, t.phone].filter(Boolean).join(' · ') || 'No contact info'}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {/* Tasks */}
          {results && results.tasks.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-gray-50 border-b border-t flex items-center gap-1.5">
                <ClipboardList className="h-3 w-3" />
                Tasks
              </div>
              {results.tasks.map(t => {
                const idx = currentIndex++
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/tasks/${t.id}`)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between gap-2',
                      selectedIndex === idx && 'bg-accent'
                    )}
                  >
                    <p className="font-medium truncate">{t.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
