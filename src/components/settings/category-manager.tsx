'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface Subcategory {
  value: string
  label: string
}

interface Category {
  value: string
  label: string
  subcategories: Subcategory[]
}

function toSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export function CategoryManager({ initial }: { initial: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initial)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  function toggleExpanded(catValue: string) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(catValue)) next.delete(catValue)
      else next.add(catValue)
      return next
    })
  }

  function updateCategory(index: number, label: string) {
    setCategories(prev => {
      const next = [...prev]
      next[index] = { ...next[index], label, value: toSlug(label) }
      return next
    })
    setHasChanges(true)
  }

  function removeCategory(index: number) {
    setCategories(prev => prev.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  function addCategory() {
    const newCat: Category = { value: '', label: '', subcategories: [] }
    setCategories(prev => [...prev, newCat])
    setHasChanges(true)
  }

  function updateSubcategory(catIndex: number, subIndex: number, label: string) {
    setCategories(prev => {
      const next = [...prev]
      const subs = [...next[catIndex].subcategories]
      subs[subIndex] = { label, value: toSlug(label) }
      next[catIndex] = { ...next[catIndex], subcategories: subs }
      return next
    })
    setHasChanges(true)
  }

  function removeSubcategory(catIndex: number, subIndex: number) {
    setCategories(prev => {
      const next = [...prev]
      const subs = next[catIndex].subcategories.filter((_, i) => i !== subIndex)
      next[catIndex] = { ...next[catIndex], subcategories: subs }
      return next
    })
    setHasChanges(true)
  }

  function addSubcategory(catIndex: number) {
    setCategories(prev => {
      const next = [...prev]
      next[catIndex] = {
        ...next[catIndex],
        subcategories: [...next[catIndex].subcategories, { value: '', label: '' }],
      }
      return next
    })
    // Auto-expand when adding subcategory — read from updated state
    setCategories(prev => {
      const catKey = prev[catIndex]?.value || `new-${catIndex}`
      setExpandedCats(ex => new Set(ex).add(catKey))
      return prev
    })
    setHasChanges(true)
  }

  async function handleSave() {
    // Validate
    for (const cat of categories) {
      if (!cat.label.trim()) {
        toast.error('All categories must have a name')
        return
      }
    }

    setSaving(true)
    try {
      // Ensure values are set from labels
      const cleaned = categories.map(cat => ({
        value: cat.value || toSlug(cat.label),
        label: cat.label.trim(),
        subcategories: cat.subcategories
          .filter(s => s.label.trim())
          .map(s => ({
            value: s.value || toSlug(s.label),
            label: s.label.trim(),
          })),
      }))

      const res = await fetch('/api/settings/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: cleaned }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error)
      }

      const saved = await res.json()
      setCategories(saved)
      setHasChanges(false)
      toast.success('Categories saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setCategories(initial)
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Expense Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage expense categories and subcategories used across the app
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              Discard
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((cat, catIndex) => (
          <Card key={catIndex} className="p-0 overflow-hidden">
            {/* Category header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/50">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              <button
                type="button"
                onClick={() => toggleExpanded(cat.value || `new-${catIndex}`)}
                className="shrink-0"
              >
                {expandedCats.has(cat.value || `new-${catIndex}`) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <Input
                value={cat.label}
                onChange={e => updateCategory(catIndex, e.target.value)}
                placeholder="Category name"
                className="h-8 font-medium bg-white"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {cat.subcategories.length} sub
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addSubcategory(catIndex)}
                className="shrink-0 h-8 px-2"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCategory(catIndex)}
                className="shrink-0 h-8 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Subcategories */}
            {expandedCats.has(cat.value || `new-${catIndex}`) && cat.subcategories.length > 0 && (
              <div className="border-t px-4 py-2 space-y-1.5">
                {cat.subcategories.map((sub, subIndex) => (
                  <div key={subIndex} className="flex items-center gap-2 ml-8">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                    <Input
                      value={sub.label}
                      onChange={e => updateSubcategory(catIndex, subIndex, e.target.value)}
                      placeholder="Subcategory name"
                      className="h-7 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSubcategory(catIndex, subIndex)}
                      className="shrink-0 h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addCategory} className="w-full">
        <Plus className="h-4 w-4 mr-1.5" />
        Add Category
      </Button>
    </div>
  )
}
