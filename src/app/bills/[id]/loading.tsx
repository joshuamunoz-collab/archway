import { LoadingShell } from '@/components/shared/loading-shell'
import { DetailPageSkeleton } from '@/components/shared/page-skeleton'

export default function BillDetailLoading() {
  return <LoadingShell><DetailPageSkeleton /></LoadingShell>
}
