import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, sanitizeString, parseAmount } from '@/lib/auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const entities = await prisma.entity.findMany({
    include: { bankAccounts: { orderBy: { accountType: 'asc' } } },
    orderBy: { name: 'asc' },
  })

  // Serialize Prisma Decimal fields
  const serialized = entities.map(e => ({
    ...e,
    pmFeePct: Number(e.pmFeePct),
  }))

  return NextResponse.json(serialized)
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const name = sanitizeString(body.name, 200)
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const pmFee = parseAmount(body.pmFeePct)

  const entity = await prisma.entity.create({
    data: {
      name,
      ein: sanitizeString(body.ein, 20),
      address: sanitizeString(body.address, 500),
      phone: sanitizeString(body.phone, 30),
      email: sanitizeString(body.email, 200),
      pmFeePct: pmFee != null && pmFee <= 100 ? pmFee : 10,
      notes: sanitizeString(body.notes, 2000),
    },
    include: { bankAccounts: true },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'entity',
      entityId: entity.id,
      action: 'created',
      details: { name: entity.name },
      userId: auth.user.id,
    },
  })

  return NextResponse.json({ ...entity, pmFeePct: Number(entity.pmFeePct) }, { status: 201 })
}
