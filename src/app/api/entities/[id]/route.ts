import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, sanitizeString, parseAmount } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()
  const name = sanitizeString(body.name, 200)

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const pmFee = parseAmount(body.pmFeePct)

  try {
    const entity = await prisma.entity.update({
      where: { id },
      data: {
        name,
        ein: sanitizeString(body.ein, 20),
        address: sanitizeString(body.address, 500),
        phone: sanitizeString(body.phone, 30),
        email: sanitizeString(body.email, 200),
        pmFeePct: pmFee != null && pmFee <= 100 ? pmFee : 10,
        notes: sanitizeString(body.notes, 2000),
      },
      include: { bankAccounts: { orderBy: { accountType: 'asc' } } },
    })

    await prisma.activityLog.create({
      data: {
        entityType: 'entity',
        entityId: entity.id,
        action: 'updated',
        details: { name: entity.name },
        userId: auth.user.id,
      },
    })

    return NextResponse.json(entity)
  } catch {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  // Prevent deletion if properties are assigned
  const count = await prisma.property.count({ where: { entityId: id } })
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} propert${count === 1 ? 'y is' : 'ies are'} assigned to this entity.` },
      { status: 409 }
    )
  }

  try {
    await prisma.entity.delete({ where: { id } })

    await prisma.activityLog.create({
      data: {
        entityType: 'entity',
        entityId: id,
        action: 'deleted',
        details: {},
        userId: auth.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
  }
}
