import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()

  const note = await prisma.quickNote.findUnique({ where: { id } })
  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {}
  if (body.taskId !== undefined) updateData.taskId = body.taskId

  const updated = await prisma.quickNote.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const note = await prisma.quickNote.findUnique({ where: { id } })
  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  await prisma.quickNote.delete({ where: { id } })

  await prisma.activityLog.create({
    data: {
      entityType: 'quick_note',
      entityId: id,
      action: 'note_deleted',
      details: { category: note.category },
      userId: auth.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
