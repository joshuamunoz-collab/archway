'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { BillsTable } from './bills-table'
import type { PipelineCard } from './bills-pipeline'

// Lazy-load pipeline to keep dnd-kit out of the initial server bundle
const BillsPipeline = dynamic(
  () => import('./bills-pipeline').then(mod => ({ default: mod.BillsPipeline })),
  { ssr: false }
)

interface PropertyOption {
  id: string
  addressLine1: string
  addressLine2: string | null
}

interface Props {
  pipelineCards: PipelineCard[]
  properties: PropertyOption[]
}

export function BillsViewToggle({ pipelineCards, properties }: Props) {
  const [view, setView] = useState<'list' | 'pipeline'>('list')

  if (view === 'pipeline') {
    return (
      <BillsPipeline
        cards={pipelineCards}
        onSwitchView={() => setView('list')}
      />
    )
  }

  return (
    <BillsTable
      cards={pipelineCards}
      properties={properties}
      onSwitchView={() => setView('pipeline')}
    />
  )
}
