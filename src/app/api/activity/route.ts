import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50') || 50))
  const entityType = searchParams.get('entityType') ?? undefined
  const skip = (page - 1) * limit

  const where = entityType ? { entityType } : {}

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ])

  return NextResponse.json({
    logs: logs.map(l => ({
      id: l.id,
      entityType: l.entityType,
      entityId: l.entityId,
      action: l.action,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
      user: l.user ? { fullName: l.user.fullName, email: l.user.email } : null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}
