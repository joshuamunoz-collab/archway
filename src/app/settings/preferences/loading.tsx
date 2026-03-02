import { LoadingShell } from '@/components/shared/loading-shell'
import { SettingsPageSkeleton } from '@/components/shared/page-skeleton'

export default function PreferencesLoading() {
  return <LoadingShell><SettingsPageSkeleton /></LoadingShell>
}
