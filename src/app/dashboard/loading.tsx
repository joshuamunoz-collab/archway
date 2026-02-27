import { LoadingShell } from '@/components/shared/loading-shell'
import { DashboardSkeleton } from '@/components/shared/page-skeleton'

export default function DashboardLoading() {
  return <LoadingShell><DashboardSkeleton /></LoadingShell>
}
