import { LoadingShell } from '@/components/shared/loading-shell'
import { TablePageSkeleton } from '@/components/shared/page-skeleton'

export default function TenantsLoading() {
  return <LoadingShell><TablePageSkeleton cols={5} rows={8} /></LoadingShell>
}
