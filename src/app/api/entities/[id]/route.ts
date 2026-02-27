import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, ein, address, phone, email, pmFeePct, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const entity = await prisma.entity.update({
    where: { id },
    data: {
      name: name.trim(),
      ein: ein?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      pmFeePct: pmFeePct ?? 10,
      notes: notes?.trim() || null,
    },
    include: { bankAccounts: { orderBy: { accountType: 'asc' } } },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'entity',
      entityId: entity.id,
      action: 'updated',
      details: { name: entity.name },
      userId: user.id,
    },
  })

  return NextResponse.json(entity)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Prevent deletion if properties are assigned
  const count = await prisma.property.count({ where: { entityId: id } })
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} propert${count === 1 ? 'y is' : 'ies are'} assigned to this entity.` },
      { status: 409 }
    )
  }

  await prisma.entity.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
