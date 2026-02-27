import { LoadingShell } from '@/components/shared/loading-shell'
import { KanbanSkeleton } from '@/components/shared/page-skeleton'

export default function PipelineLoading() {
  return <LoadingShell><KanbanSkeleton /></LoadingShell>
}
