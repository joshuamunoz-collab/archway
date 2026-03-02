import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, sanitizeString } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id: entityId } = await params
  const body = await request.json()
  const accountName = sanitizeString(body.accountName, 200)

  if (!accountName) {
    return NextResponse.json({ error: 'Account name is required' }, { status: 400 })
  }
  if (!['checking', 'money_market'].includes(body.accountType)) {
    return NextResponse.json({ error: 'Invalid account type' }, { status: 400 })
  }

  // If setting as default, unset others for this entity
  if (body.isDefault) {
    await prisma.bankAccount.updateMany({
      where: { entityId },
      data: { isDefault: false },
    })
  }

  const account = await prisma.bankAccount.create({
    data: {
      entityId,
      accountName,
      accountType: body.accountType,
      institution: sanitizeString(body.institution, 200),
      lastFour: sanitizeString(body.lastFour, 4),
      isDefault: body.isDefault ?? false,
      notes: sanitizeString(body.notes, 1000),
    },
  })

  return NextResponse.json(account, { status: 201 })
}
