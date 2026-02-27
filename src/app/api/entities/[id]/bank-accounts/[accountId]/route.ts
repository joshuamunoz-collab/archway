import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: entityId, accountId } = await params
  const body = await request.json()
  const { accountName, accountType, institution, lastFour, isDefault, notes } = body

  if (!accountName?.trim()) {
    return NextResponse.json({ error: 'Account name is required' }, { status: 400 })
  }

  if (isDefault) {
    await prisma.bankAccount.updateMany({
      where: { entityId },
      data: { isDefault: false },
    })
  }

  const account = await prisma.bankAccount.update({
    where: { id: accountId },
    data: {
      accountName: accountName.trim(),
      accountType,
      institution: institution?.trim() || null,
      lastFour: lastFour?.trim() || null,
      isDefault: isDefault ?? false,
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json(account)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { accountId } = await params

  await prisma.bankAccount.delete({ where: { id: accountId } })

  return NextResponse.json({ success: true })
}
