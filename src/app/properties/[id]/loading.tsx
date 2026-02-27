import { LoadingShell } from '@/components/shared/loading-shell'
import { DetailPageSkeleton } from '@/components/shared/page-skeleton'

export default function PropertyDetailLoading() {
  return <LoadingShell><DetailPageSkeleton /></LoadingShell>
}
