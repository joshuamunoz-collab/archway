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

interface Props {
  tableBills: Parameters<typeof BillsTable>[0]['bills']
  pipelineCards: PipelineCard[]
  properties: Parameters<typeof BillsTable>[0]['properties']
}

export function BillsViewToggle({ tableBills, pipelineCards, properties }: Props) {
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
      bills={tableBills}
      properties={properties}
      onSwitchView={() => setView('pipeline')}
    />
  )
}
