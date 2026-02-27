import { LoadingShell } from '@/components/shared/loading-shell'
import { TablePageSkeleton } from '@/components/shared/page-skeleton'

export default function ReportsLoading() {
  return <LoadingShell><TablePageSkeleton cols={3} rows={7} /></LoadingShell>
}
