import { LoadingShell } from '@/components/shared/loading-shell'
import { SettingsPageSkeleton } from '@/components/shared/page-skeleton'

export default function CategoriesLoading() {
  return <LoadingShell><SettingsPageSkeleton /></LoadingShell>
}
