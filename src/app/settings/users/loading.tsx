import { LoadingShell } from '@/components/shared/loading-shell'
import { SettingsPageSkeleton } from '@/components/shared/page-skeleton'

export default function UsersLoading() {
  return <LoadingShell><SettingsPageSkeleton /></LoadingShell>
}
