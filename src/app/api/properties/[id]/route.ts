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

  // Only allow safe fields to be updated here (status has its own route)
  const allowed = ['notes', 'parcelNumber', 'ward', 'neighborhood', 'propertyType',
    'beds', 'baths', 'sqft', 'yearBuilt', 'isSection8', 'addressLine2']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await prisma.property.update({ where: { id }, data })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'updated',
      details: { updatedFields: Object.keys(data) },
      userId: user.id,
    },
  })

  return NextResponse.json(updated)
}
