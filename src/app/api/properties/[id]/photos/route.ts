import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()

  if (!body.fileUrl) {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })
  }

  const photo = await prisma.photo.create({
    data: {
      propertyId: id,
      fileUrl: body.fileUrl,
      category: body.category || null,
      caption: body.caption || null,
      takenAt: body.takenAt ? new Date(body.takenAt) : null,
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'photo_uploaded',
      details: { category: body.category },
      userId: auth.user.id,
    },
  })

  return NextResponse.json(photo, { status: 201 })
}
