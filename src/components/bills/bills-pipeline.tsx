'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { List, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ---------- types ---------- */

export interface PipelineCard {
  id: string
  leaseId: string
  billId: string | null
  propertyId: string
  propertyAddress: string
  entityId: string
  entityName: string
  tenantName: string
  monthlyRent: number
  status: string
  paidDate: string | null
  date: string
  vendorName: string | null
  invoiceNumber: string | null
}

const PIPELINE_COLUMNS = [
  { status: 'received', label: 'Needs Review', color: 'amber' },
  { status: 'under_review', label: 'Under Review', color: 'blue' },
  { status: 'approved', label: 'Approved', color: 'emerald' },
  { status: 'disputed', label: 'Disputed', color: 'red' },
  { status: 'paid', label: 'Paid', color: 'purple' },
] as const

type ColumnColor = (typeof PIPELINE_COLUMNS)[number]['color']

const COL_STYLES: Record<ColumnColor, { header: string; badge: string }> = {
  amber:   { header: 'bg-amber-50 text-amber-800 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  blue:    { header: 'bg-blue-50 text-blue-800 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  emerald: { header: 'bg-emerald-50 text-emerald-800 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  red:     { header: 'bg-red-50 text-red-800 border-red-200', badge: 'bg-red-100 text-red-700' },
  purple:  { header: 'bg-purple-50 text-purple-800 border-purple-200', badge: 'bg-purple-100 text-purple-700' },
}

/* ---------- helpers ---------- */

function groupByEntity(cards: PipelineCard[]) {
  const map = new Map<string, { entityId: string; entityName: string; cards: PipelineCard[] }>()
  for (const c of cards) {
    if (!map.has(c.entityId)) {
      map.set(c.entityId, { entityId: c.entityId, entityName: c.entityName, cards: [] })
    }
    map.get(c.entityId)!.cards.push(c)
  }
  return Array.from(map.values()).sort((a, b) => a.entityName.localeCompare(b.entityName))
}

/* ---------- Droppable Column ---------- */

function DroppableColumn({
  columnStatus, columnLabel, color, cards, entityId,
}: {
  columnStatus: string; columnLabel: string; color: ColumnColor
  cards: PipelineCard[]; entityId: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${entityId}::${columnStatus}` })
  const styles = COL_STYLES[color]
  const total = cards.reduce((s, c) => s + c.monthlyRent, 0)

  return (
    <div className="flex-1 min-w-[200px]">
      <div className={cn('rounded-t-lg border px-3 py-2 flex items-center justify-between', styles.header)}>
        <span className="text-xs font-semibold">{columnLabel}</span>
        <span className={cn('text-[10px] font-medium rounded-full px-1.5 py-0.5', styles.badge)}>{cards.length}</span>
      </div>
      {total > 0 && (
        <div className="px-3 py-1 bg-gray-50 border-x border-gray-200 text-[10px] text-muted-foreground font-medium tabular-nums">
          {formatCurrency(total)}
        </div>
      )}
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[120px] p-2 space-y-2 rounded-b-lg border border-t-0 border-gray-200 transition-colors',
          isOver ? 'bg-blue-50/50' : 'bg-gray-50/30',
          cards.length === 0 && 'border-dashed border-gray-300 flex items-center justify-center'
        )}
      >
        {cards.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/50 select-none">Drop here</p>
        ) : (
          cards.map(c => <DraggableCard key={c.id} card={c} entityId={entityId} />)
        )}
      </div>
    </div>
  )
}

/* ---------- Draggable Card ---------- */

function DraggableCard({ card, entityId }: { card: PipelineCard; entityId: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { entityId, card },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn('cursor-grab active:cursor-grabbing transition-opacity', isDragging && 'opacity-30')}
    >
      <PipelineCardUI card={card} />
    </div>
  )
}

function PipelineCardUI({ card, overlay }: { card: PipelineCard; overlay?: boolean }) {
  return (
    <Card className={cn(
      'shadow-sm hover:shadow-md transition-shadow',
      overlay && 'shadow-lg ring-2 ring-blue-400 rotate-2 cursor-grabbing'
    )}>
      <CardContent className="p-3 space-y-1.5">
        <Link
          href={`/properties/${card.propertyId}`}
          className="text-xs font-medium text-foreground hover:text-primary hover:underline leading-tight block"
          onClick={e => e.stopPropagation()}
        >
          {card.propertyAddress}
        </Link>
        <p className="text-[11px] text-muted-foreground truncate">{card.tenantName}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tabular-nums">{formatCurrency(card.monthlyRent)}</span>
          {card.billId && (
            <Link
              href={`/bills/${card.billId}`}
              className="text-[10px] text-blue-600 hover:underline"
              onClick={e => e.stopPropagation()}
            >
              View Bill
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------- Entity Section ---------- */

function EntitySection({ entityName, entityId, cards }: {
  entityName: string; entityId: string; cards: PipelineCard[]
}) {
  const byStatus = useMemo(() => {
    const m: Record<string, PipelineCard[]> = {}
    for (const col of PIPELINE_COLUMNS) m[col.status] = []
    for (const c of cards) { if (m[c.status]) m[c.status].push(c) }
    return m
  }, [cards])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{entityName}</h2>
        <Badge variant="secondary" className="text-[10px] h-5">
          {cards.length} tenant{cards.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {PIPELINE_COLUMNS.map(col => (
          <DroppableColumn
            key={col.status}
            columnStatus={col.status}
            columnLabel={col.label}
            color={col.color}
            cards={byStatus[col.status]}
            entityId={entityId}
          />
        ))}
      </div>
    </div>
  )
}

/* ---------- Main Pipeline Component ---------- */

export function BillsPipeline({
  cards: initialCards,
  onSwitchView,
}: {
  cards: PipelineCard[]
  onSwitchView: () => void
}) {
  const router = useRouter()
  const [cards, setCards] = useState(initialCards)
  const [activeCard, setActiveCard] = useState<PipelineCard | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // KPI
  const { needsReviewAmt, approvedAmt, paidThisMonth } = useMemo(() => {
    let nr = 0, ap = 0, ptm = 0
    const now = new Date()
    for (const c of cards) {
      if (c.status === 'received' || c.status === 'under_review') nr += c.monthlyRent
      if (c.status === 'approved') ap += c.monthlyRent
      if (c.status === 'paid' && c.paidDate) {
        const d = new Date(c.paidDate)
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) ptm += c.monthlyRent
      }
    }
    return { needsReviewAmt: nr, approvedAmt: ap, paidThisMonth: ptm }
  }, [cards])

  const entityGroups = useMemo(() => groupByEntity(cards), [cards])

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const card = (e.active.data.current as { card: PipelineCard } | undefined)?.card
    if (card) setActiveCard(card)
  }, [])

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveCard(null)
    const { active, over } = e
    if (!over) return

    const droppedId = String(over.id)
    if (!droppedId.includes('::')) return

    const [targetEntityId, targetStatus] = droppedId.split('::')
    const sourceEntityId = (active.data.current as { entityId?: string })?.entityId
    const cardId = String(active.id)

    if (sourceEntityId !== targetEntityId) return

    const card = cards.find(c => c.id === cardId)
    if (!card || card.status === targetStatus) return

    // Optimistic update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: targetStatus } : c))

    try {
      if (card.billId) {
        const res = await fetch(`/api/bills/${card.billId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update')
      } else {
        // Create bill first
        const today = new Date().toISOString().slice(0, 10)
        const createRes = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: card.propertyId,
            billDate: today,
            lineItems: [{ description: `Monthly rent – ${card.tenantName}`, amount: card.monthlyRent }],
          }),
        })
        if (!createRes.ok) throw new Error((await createRes.json().catch(() => ({}))).error || 'Failed to create bill')
        const newBill = await createRes.json()

        // Set status if not the default
        if (targetStatus !== 'received') {
          const patchRes = await fetch(`/api/bills/${newBill.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus }),
          })
          if (!patchRes.ok) throw new Error((await patchRes.json().catch(() => ({}))).error || 'Failed to update')
        }

        setCards(prev => prev.map(c => c.id === cardId ? { ...c, billId: newBill.id } : c))
      }
      toast.success(`Moved to ${PIPELINE_COLUMNS.find(c => c.status === targetStatus)?.label}`)
      router.refresh()
    } catch (err) {
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: card.status } : c))
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }, [cards, router])

  return (
    <div className="px-8 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Bills Pipeline</h1>
          <span className="text-sm text-muted-foreground">({cards.length} tenants)</span>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onSwitchView}>
          <List className="h-4 w-4" /> List View
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Needs Review</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums text-amber-600">{formatCurrency(needsReviewAmt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Approved / Unpaid</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums text-blue-600">{formatCurrency(approvedAmt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Paid This Month</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums">{formatCurrency(paidThisMonth)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Board */}
      {entityGroups.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No active tenants found.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="space-y-8">
            {entityGroups.map(g => (
              <EntitySection key={g.entityId} entityId={g.entityId} entityName={g.entityName} cards={g.cards} />
            ))}
          </div>
          <DragOverlay>
            {activeCard ? <PipelineCardUI card={activeCard} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
