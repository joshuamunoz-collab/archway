import { LoadingShell } from '@/components/shared/loading-shell'
import { TablePageSkeleton } from '@/components/shared/page-skeleton'

export default function RehabsLoading() {
  return <LoadingShell><TablePageSkeleton cols={5} rows={6} /></LoadingShell>
}
