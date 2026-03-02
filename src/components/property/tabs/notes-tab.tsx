import { ListTodo, StickyNote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import type { PropertyDetailData, QuickNoteData } from '@/types/property'

const CATEGORY_STYLES: Record<string, { label: string; className: string }> = {
  maintenance:      { label: '🔧 Maintenance',  className: 'bg-orange-100 text-orange-700' },
  vacancy:          { label: '🏠 Vacancy',      className: 'bg-purple-100 text-purple-700' },
  insurance:        { label: '🛡️ Insurance',    className: 'bg-cyan-100 text-cyan-700' },
  financial:        { label: '💰 Financial',     className: 'bg-emerald-100 text-emerald-700' },
  property_manager: { label: '👷 PM',           className: 'bg-amber-100 text-amber-700' },
  general:          { label: '📋 General',       className: 'bg-gray-100 text-gray-600' },
}

function highlightMentions(content: string, mentionedProperties: QuickNoteData['mentionedProperties']) {
  if (mentionedProperties.length === 0) return <span>{content}</span>

  const escaped = mentionedProperties.map(p =>
    p.mentionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  )
  const re = new RegExp(`(@(?:${escaped.join('|')}))`, 'g')
  const parts = content.split(re)

  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="bg-blue-100 text-blue-700 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

export function NotesTab({ data }: { data: PropertyDetailData }) {
  const { quickNotes } = data

  if (quickNotes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <StickyNote className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No notes linked to this property.</p>
          <p className="text-xs text-gray-400 mt-1">
            Create a note with @{data.addressLine1} to link it here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {quickNotes.map(note => {
        const style = CATEGORY_STYLES[note.category] ?? CATEGORY_STYLES.general
        return (
          <Card key={note.id}>
            <CardContent className="pt-4 pb-3 space-y-2">
              {/* Header: author + category + timestamp */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{note.authorName}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>
                    {style.label}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDate(note.createdAt)}
                </span>
              </div>

              {/* Content with highlighted mentions */}
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {highlightMentions(note.content, note.mentionedProperties)}
              </p>

              {/* Footer: Create Task placeholder */}
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs text-gray-400"
                  disabled
                  title="Coming soon"
                >
                  <ListTodo className="h-3.5 w-3.5" />
                  Create Task
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
