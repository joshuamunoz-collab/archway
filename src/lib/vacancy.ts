export type VacancyUrgency = 'normal' | 'warning' | 'urgent' | 'critical'

export function getVacancyDays(vacantSince: Date | string | null | undefined): number {
  if (!vacantSince) return 0
  const since = typeof vacantSince === 'string' ? new Date(vacantSince) : vacantSince
  return Math.floor((Date.now() - since.getTime()) / 86_400_000)
}

export function getVacancyUrgency(days: number): VacancyUrgency {
  if (days >= 60) return 'critical'
  if (days >= 45) return 'urgent'
  if (days >= 30) return 'warning'
  return 'normal'
}

export const VACANCY_BAR_COLOR: Record<VacancyUrgency, string> = {
  normal:   'bg-emerald-500',
  warning:  'bg-amber-500',
  urgent:   'bg-orange-500',
  critical: 'bg-red-500',
}

export const VACANCY_TEXT_COLOR: Record<VacancyUrgency, string> = {
  normal:   'text-emerald-600',
  warning:  'text-amber-600',
  urgent:   'text-orange-600',
  critical: 'text-red-600',
}

export const VACANCY_BORDER_COLOR: Record<VacancyUrgency, string> = {
  normal:   'border-emerald-200 bg-emerald-50',
  warning:  'border-amber-200 bg-amber-50',
  urgent:   'border-orange-200 bg-orange-50',
  critical: 'border-red-200 bg-red-50',
}

export const VACANCY_MESSAGE: Record<VacancyUrgency, string> = {
  normal:   'Vacancy coverage active',
  warning:  'Review vacancy insurance coverage',
  urgent:   'Contact insurance broker immediately',
  critical: 'Standard coverage may be void — act now',
}
