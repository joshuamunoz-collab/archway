import { LoadingShell } from '@/components/shared/loading-shell'
import { TablePageSkeleton } from '@/components/shared/page-skeleton'

export default function PropertiesLoading() {
  return <LoadingShell><TablePageSkeleton cols={6} rows={10} /></LoadingShell>
}
