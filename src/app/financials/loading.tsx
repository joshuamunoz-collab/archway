import { LoadingShell } from '@/components/shared/loading-shell'
import { FinancialsSkeleton } from '@/components/shared/page-skeleton'

export default function FinancialsLoading() {
  return <LoadingShell><FinancialsSkeleton /></LoadingShell>
}
