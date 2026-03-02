'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ── Types ────────────────────────────────────────────────────────────────────

interface AutocompleteProperty {
  id: string
  addressLine1: string
  streetNumber: string | null
  streetName: string | null
  entityName: string
}

interface Mention {
  propertyId: string
  mentionText: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'maintenance', label: '🔧 Maintenance' },
  { value: 'vacancy', label: '🏠 Vacancy' },
  { value: 'insurance', label: '🛡️ Insurance' },
  { value: 'financial', label: '💰 Financial' },
  { value: 'property_manager', label: '👷 PM' },
  { value: 'general', label: '📋 General' },
] as const

// ── Auto-category detection (client-side, mirrors API logic) ─────────────────

const CATEGORY_KEYWORDS: [string, RegExp[]][] = [
  ['maintenance',      [/broken/i, /leak/i, /repair/i, /\bfix\b/i, /window/i, /hvac/i]],
  ['vacancy',          [/vacant/i, /move.?out/i, /listed/i]],
  ['insurance',        [/claim/i, /policy/i, /damage/i]],
  ['financial',        [/\brent\b/i, /payment/i, /deposit/i]],
  ['property_manager', [/\bpm\b/i, /contractor/i]],
]

function detectCategory(text: string): string {
  for (const [cat, patterns] of CATEGORY_KEYWORDS) {
    if (patterns.some((re) => re.test(text))) return cat
  }
  return 'general'
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function filterProperties(properties: AutocompleteProperty[], query: string) {
  if (!query) return properties.slice(0, 5)
  const q = query.toLowerCase()
  return properties
    .filter(
      (p) =>
        p.addressLine1.toLowerCase().includes(q) ||
        (p.streetNumber && p.streetNumber.toLowerCase().includes(q)) ||
        (p.streetName && p.streetName.toLowerCase().includes(q)),
    )
    .slice(0, 5)
}

/** Find the @query the cursor is currently inside, if any. */
function getActiveMentionQuery(text: string, cursorPos: number) {
  // Walk backwards from cursor to find @
  let i = cursorPos - 1
  while (i >= 0) {
    if (text[i] === '@') {
      const query = text.slice(i + 1, cursorPos)
      // Abort if there's a newline between @ and cursor
      if (query.includes('\n')) return null
      return { start: i, query }
    }
    // Stop at whitespace before the query text only if it's a newline
    if (text[i] === '\n') return null
    i--
  }
  return null
}

/** Build highlighted HTML from content, marking @mentions */
function buildHighlightSegments(
  text: string,
  mentionTexts: string[],
): { text: string; isMention: boolean }[] {
  if (mentionTexts.length === 0) return [{ text, isMention: false }]

  // Build a regex that matches any @mentionText
  const escaped = mentionTexts.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  )
  const re = new RegExp(`(@(?:${escaped.join('|')}))`, 'g')
  const segments: { text: string; isMention: boolean }[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isMention: false })
    }
    segments.push({ text: match[0], isMention: true })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isMention: false })
  }
  return segments
}

// ── Component ────────────────────────────────────────────────────────────────

export function CreateNoteDialog() {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mentions, setMentions] = useState<Mention[]>([])

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteProperty[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [mentionCtx, setMentionCtx] = useState<{ start: number; query: string } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const propertiesRef = useRef<AutocompleteProperty[]>([])
  const fetchedRef = useRef(false)
  const userPickedCategoryRef = useRef(false)
  const autoDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-focus textarea when dialog opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => textareaRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  // Auto-expand textarea + sync overlay scroll
  const handleInput = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(120, el.scrollHeight)}px`
  }, [])

  // Sync scroll between textarea and overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  // Fetch properties on first @ trigger
  async function ensureProperties() {
    if (fetchedRef.current) return propertiesRef.current
    try {
      const res = await fetch('/api/properties/autocomplete')
      if (res.ok) {
        const data = await res.json()
        propertiesRef.current = data
      }
    } catch {
      // Silently fail — autocomplete just won't work
    }
    fetchedRef.current = true
    return propertiesRef.current
  }

  // Auto-detect category from content (only if user hasn't manually picked one)
  function runAutoDetect(text: string) {
    if (userPickedCategoryRef.current) return
    if (!text.trim()) {
      setCategory(null)
      return
    }
    setCategory(detectCategory(text))
  }

  // Schedule debounced auto-detect (1 second after last keystroke)
  function scheduleAutoDetect(text: string) {
    if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current)
    autoDetectTimerRef.current = setTimeout(() => runAutoDetect(text), 1000)
  }

  // Handle content changes + detect @mentions
  async function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    const cursor = e.target.selectionStart
    setContent(val)
    scheduleAutoDetect(val)

    const ctx = getActiveMentionQuery(val, cursor)
    if (ctx) {
      const props = await ensureProperties()
      const filtered = filterProperties(props, ctx.query)
      setMentionCtx(ctx)
      setSuggestions(filtered)
      setSuggestionIndex(0)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
      setMentionCtx(null)
    }
  }

  // Insert selected mention into content
  function selectMention(property: AutocompleteProperty) {
    if (!mentionCtx || !textareaRef.current) return

    const before = content.slice(0, mentionCtx.start)
    const after = content.slice(mentionCtx.start + 1 + mentionCtx.query.length)
    const mentionText = property.addressLine1
    const newContent = `${before}@${mentionText} ${after}`

    setContent(newContent)
    setMentions((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.propertyId === property.id)) return prev
      return [...prev, { propertyId: property.id, mentionText }]
    })
    setShowSuggestions(false)
    setMentionCtx(null)

    // Restore cursor position after the inserted mention
    const cursorPos = mentionCtx.start + 1 + mentionText.length + 1
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(cursorPos, cursorPos)
      handleInput()
    })
  }

  // Keyboard navigation for suggestions
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSuggestionIndex((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectMention(suggestions[suggestionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(false)
        return
      }
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave()
    }
  }

  function reset() {
    setContent('')
    setCategory(null)
    setSaving(false)
    setMentions([])
    setShowSuggestions(false)
    setMentionCtx(null)
    setSuggestions([])
    userPickedCategoryRef.current = false
    if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { content: content.trim() }
      if (category) body.category = category
      if (mentions.length > 0) body.properties = mentions
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save note')
      }
      toast.success('Note saved')
      reset()
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  // Build highlight segments for the overlay
  const mentionTexts = mentions.map((m) => m.mentionText)
  const segments = buildHighlightSegments(content, mentionTexts)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Textarea with highlight overlay */}
          <div className="relative">
            {/* Highlight overlay — sits behind textarea, shows colored mention backgrounds */}
            <div
              ref={overlayRef}
              aria-hidden
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg px-3 py-2.5 text-sm"
              style={{
                fontFamily: 'inherit',
                lineHeight: '1.5rem',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                color: 'transparent',
              }}
            >
              {segments.map((seg, i) =>
                seg.isMention ? (
                  <mark
                    key={i}
                    className="bg-blue-100 text-transparent rounded px-0.5"
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </div>

            {/* Actual textarea — transparent background so highlights show through */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onInput={handleInput}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current)
                runAutoDetect(content)
              }}
              placeholder="What's on your mind? Type @ to mention a property…"
              className="relative w-full min-h-[120px] rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
              style={{
                fontFamily: 'inherit',
                lineHeight: '1.5rem',
                caretColor: '#1a1a1a',
              }}
            />

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                {suggestions.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                      i === suggestionIndex
                        ? 'bg-blue-50 text-blue-900'
                        : 'hover:bg-gray-50'
                    }`}
                    onMouseDown={(e) => {
                      // Use mouseDown instead of click to fire before textarea blur
                      e.preventDefault()
                      selectMention(p)
                    }}
                    onMouseEnter={() => setSuggestionIndex(i)}
                  >
                    <span className="font-medium truncate">{p.addressLine1}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">
                      {p.entityName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  userPickedCategoryRef.current = true
                  setCategory((prev) => (prev === cat.value ? null : cat.value))
                }}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Save */}
          <div className="flex items-center justify-between">
            {mentions.length > 0 && (
              <p className="text-xs text-gray-400">
                {mentions.length} propert{mentions.length === 1 ? 'y' : 'ies'} linked
              </p>
            )}
            <div className="ml-auto">
              <Button
                onClick={handleSave}
                disabled={saving || !content.trim()}
                size="sm"
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
