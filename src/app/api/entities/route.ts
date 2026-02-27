import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entities = await prisma.entity.findMany({
    include: { bankAccounts: { orderBy: { accountType: 'asc' } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(entities)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, ein, address, phone, email, pmFeePct, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const entity = await prisma.entity.create({
    data: {
      name: name.trim(),
      ein: ein?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      pmFeePct: pmFeePct ?? 10,
      notes: notes?.trim() || null,
    },
    include: { bankAccounts: true },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'entity',
      entityId: entity.id,
      action: 'created',
      details: { name: entity.name },
      userId: user.id,
    },
  })

  return NextResponse.json(entity, { status: 201 })
}
