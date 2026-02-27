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
      userId: user.id,
    },
  })

  return NextResponse.json(photo, { status: 201 })
}
