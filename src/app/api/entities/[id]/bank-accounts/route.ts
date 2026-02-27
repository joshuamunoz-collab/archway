import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: entityId } = await params
  const body = await request.json()
  const { accountName, accountType, institution, lastFour, isDefault, notes } = body

  if (!accountName?.trim()) {
    return NextResponse.json({ error: 'Account name is required' }, { status: 400 })
  }
  if (!['checking', 'money_market'].includes(accountType)) {
    return NextResponse.json({ error: 'Invalid account type' }, { status: 400 })
  }

  // If setting as default, unset others for this entity
  if (isDefault) {
    await prisma.bankAccount.updateMany({
      where: { entityId },
      data: { isDefault: false },
    })
  }

  const account = await prisma.bankAccount.create({
    data: {
      entityId,
      accountName: accountName.trim(),
      accountType,
      institution: institution?.trim() || null,
      lastFour: lastFour?.trim() || null,
      isDefault: isDefault ?? false,
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json(account, { status: 201 })
}
