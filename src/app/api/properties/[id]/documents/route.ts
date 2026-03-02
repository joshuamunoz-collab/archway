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

  if (!body.filename || !body.fileUrl) {
    return NextResponse.json({ error: 'filename and fileUrl are required' }, { status: 400 })
  }

  const doc = await prisma.document.create({
    data: {
      propertyId: id,
      filename: body.filename,
      fileUrl: body.fileUrl,
      fileSize: body.fileSize || null,
      docType: body.docType || null,
      notes: body.notes || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'document_uploaded',
      details: { filename: body.filename, docType: body.docType },
      userId: auth.user.id,
    },
  })

  return NextResponse.json(doc, { status: 201 })
}
