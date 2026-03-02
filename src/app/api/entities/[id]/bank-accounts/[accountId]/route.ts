import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, sanitizeString } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id: entityId, accountId } = await params
  const body = await request.json()
  const accountName = sanitizeString(body.accountName, 200)

  if (!accountName) {
    return NextResponse.json({ error: 'Account name is required' }, { status: 400 })
  }

  if (body.isDefault) {
    await prisma.bankAccount.updateMany({
      where: { entityId },
      data: { isDefault: false },
    })
  }

  try {
    const account = await prisma.bankAccount.update({
      where: { id: accountId, entityId },
      data: {
        accountName,
        accountType: body.accountType,
        institution: sanitizeString(body.institution, 200),
        lastFour: sanitizeString(body.lastFour, 4),
        isDefault: body.isDefault ?? false,
        notes: sanitizeString(body.notes, 1000),
      },
    })

    return NextResponse.json(account)
  } catch {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id: entityId, accountId } = await params

  try {
    await prisma.bankAccount.delete({ where: { id: accountId, entityId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })
  }
}
