'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getVacancyDays, getVacancyUrgency } from '@/lib/vacancy'
import { cn } from '@/lib/utils'

const PIPELINE_COLUMNS: { key: string; label: string }[] = [
  { key: 'vacant',             label: 'Vacant / Marketing' },
  { key: 'rehab',              label: 'Rehab In Progress' },
  { key: 'pending_inspection', label: 'Inspection Pending' },
  { key: 'pending_packet',     label: 'Packet / PHA Processing' },
]

interface PropertyCard {
  id: string
  addressLine1: string
  addressLine2: string | null
  status: string
  vacantSince: string | null
  beds: number | null
  baths: number | null
  entity: { id: string; name: string }
}

function VacancyBadge({ vacantSince }: { vacantSince: string | null }) {
  if (!vacantSince) return null
  const days = getVacancyDays(vacantSince)
  const urgency = getVacancyUrgency(days)
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
      urgency === 'critical' ? 'bg-red-100 text-red-700' :
      urgency === 'urgent'   ? 'bg-orange-100 text-orange-700' :
      urgency === 'warning'  ? 'bg-amber-100 text-amber-700' :
                               'bg-secondary text-muted-foreground'
    )}>
      {days}d vacant
    </span>
  )
}

function PropertyCardView({ property, isDragging }: { property: PropertyCard; isDragging?: boolean }) {
  return (
    <div className={cn(
      'rounded-lg border bg-white p-3 shadow-xs cursor-grab active:cursor-grabbing select-none',
      isDragging ? 'shadow-md opacity-80 rotate-1' : 'hover:shadow-sm'
    )}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{property.addressLine1}</p>
          {property.addressLine2 && (
            <p className="text-xs text-muted-foreground truncate">{property.addressLine2}</p>
          )}
        </div>
        <VacancyBadge vacantSince={property.vacantSince} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{property.entity.name.split(' ')[0]}</span>
        {(property.beds || property.baths) && (
          <span className="text-xs text-muted-foreground">
            {property.beds && `${property.beds}bd`}
            {property.beds && property.baths && '/'}
            {property.baths && `${property.baths}ba`}
          </span>
        )}
      </div>
    </div>
  )
}

function DraggableCard({ property }: { property: PropertyCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: property.id,
    data: { property },
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Link href={`/properties/${property.id}`} onClick={e => { if (isDragging) e.preventDefault() }}>
        <PropertyCardView property={property} isDragging={isDragging} />
      </Link>
    </div>
  )
}

function Column({ columnKey, label, cards }: { columnKey: string; label: string; cards: PropertyCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey })
  return (
    <div className="flex-1 min-w-[220px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <Badge variant="secondary" className="text-xs">{cards.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[200px] rounded-xl border-2 border-dashed p-2 space-y-2 transition-colors',
          isOver ? 'border-primary/50 bg-primary/5' : 'border-border bg-secondary/30'
        )}
      >
        {cards.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-6">No properties</p>
        )}
        {cards.map(p => (
          <DraggableCard key={p.id} property={p} />
        ))}
      </div>
    </div>
  )
}

export function PipelineBoard({
  properties,
  entities,
}: {
  properties: PropertyCard[]
  entities: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [cards, setCards] = useState(properties)
  const [activeCard, setActiveCard] = useState<PropertyCard | null>(null)
  const [entityFilter, setEntityFilter] = useState('all')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const filtered = entityFilter === 'all'
    ? cards
    : cards.filter(c => c.entity.id === entityFilter)

  const getColumnCards = useCallback(
    (status: string) => filtered.filter(c => c.status === status),
    [filtered]
  )

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find(c => c.id === event.active.id)
    if (card) setActiveCard(card)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    if (!over) return

    const cardId = active.id as string
    const newStatus = over.id as string

    const card = cards.find(c => c.id === cardId)
    if (!card || card.status === newStatus) return

    // Optimistic update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: newStatus } : c))

    const res = await fetch(`/api/properties/${cardId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (!res.ok) {
      toast.error('Failed to update status')
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: card.status } : c))
      return
    }

    toast.success(`Moved to ${PIPELINE_COLUMNS.find(c => c.key === newStatus)?.label}`)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Entity filter */}
      {entities.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by entity:</span>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map(col => (
            <Column
              key={col.key}
              columnKey={col.key}
              label={col.label}
              cards={getColumnCards(col.key)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard && <PropertyCardView property={activeCard} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
