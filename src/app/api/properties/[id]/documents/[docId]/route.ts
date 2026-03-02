import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id, docId } = await params

  try {
    await prisma.document.delete({ where: { id: docId, propertyId: id } })

    await prisma.activityLog.create({
      data: {
        entityType: 'property',
        entityId: id,
        action: 'document_deleted',
        details: { docId },
        userId: auth.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }
}
