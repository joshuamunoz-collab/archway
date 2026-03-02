import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'

export interface SystemPreferences {
  defaultPmFeePct: number
  vacancyWarningDays: number
  vacancyUrgentDays: number
  vacancyCriticalDays: number
  taskEscalationHours: number
  leaseExpiryWarningDays: number
  companyName: string
  companyPhone: string
  companyEmail: string
  companyLogoUrl: string
}

export const DEFAULT_PREFERENCES: SystemPreferences = {
  defaultPmFeePct: 10,
  vacancyWarningDays: 30,
  vacancyUrgentDays: 45,
  vacancyCriticalDays: 60,
  taskEscalationHours: 48,
  leaseExpiryWarningDays: 60,
  companyName: '',
  companyPhone: '',
  companyEmail: '',
  companyLogoUrl: '',
}

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const pref = await prisma.systemPreference.findUnique({
    where: { key: 'app_preferences' },
  })

  const preferences = pref
    ? { ...DEFAULT_PREFERENCES, ...(pref.value as unknown as Partial<SystemPreferences>) }
    : DEFAULT_PREFERENCES

  return NextResponse.json(preferences)
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const preferences: SystemPreferences = {
    defaultPmFeePct: Number(body.defaultPmFeePct) || DEFAULT_PREFERENCES.defaultPmFeePct,
    vacancyWarningDays: Number(body.vacancyWarningDays) || DEFAULT_PREFERENCES.vacancyWarningDays,
    vacancyUrgentDays: Number(body.vacancyUrgentDays) || DEFAULT_PREFERENCES.vacancyUrgentDays,
    vacancyCriticalDays: Number(body.vacancyCriticalDays) || DEFAULT_PREFERENCES.vacancyCriticalDays,
    taskEscalationHours: Number(body.taskEscalationHours) || DEFAULT_PREFERENCES.taskEscalationHours,
    leaseExpiryWarningDays: Number(body.leaseExpiryWarningDays) || DEFAULT_PREFERENCES.leaseExpiryWarningDays,
    companyName: (body.companyName ?? '').trim(),
    companyPhone: (body.companyPhone ?? '').trim(),
    companyEmail: (body.companyEmail ?? '').trim(),
    companyLogoUrl: (body.companyLogoUrl ?? '').trim(),
  }

  const jsonValue = JSON.parse(JSON.stringify(preferences)) as Prisma.InputJsonValue

  await prisma.systemPreference.upsert({
    where: { key: 'app_preferences' },
    create: { key: 'app_preferences', value: jsonValue },
    update: { value: jsonValue },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'system_preference',
      entityId: 'app_preferences',
      action: 'updated',
      details: preferences as unknown as Prisma.InputJsonValue,
      userId: auth.user.id,
    },
  })

  return NextResponse.json(preferences)
}
