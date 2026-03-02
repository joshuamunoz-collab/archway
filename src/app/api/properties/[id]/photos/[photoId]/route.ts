import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id, photoId } = await params

  try {
    await prisma.photo.delete({ where: { id: photoId, propertyId: id } })

    await prisma.activityLog.create({
      data: {
        entityType: 'property',
        entityId: id,
        action: 'photo_deleted',
        details: { photoId },
        userId: auth.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }
}
