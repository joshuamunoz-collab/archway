import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

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

  try {
    const updated = await prisma.property.update({ where: { id }, data })

    await prisma.activityLog.create({
      data: {
        entityType: 'property',
        entityId: id,
        action: 'updated',
        details: { updatedFields: Object.keys(data) },
        userId: auth.user.id,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }
}
