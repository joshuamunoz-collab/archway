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

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const message = await prisma.pmTaskMessage.create({
    data: {
      taskId: id,
      userId: auth.user.id,
      message: body.message.trim(),
    },
    include: { user: { select: { id: true, fullName: true } } },
  })

  return NextResponse.json(message, { status: 201 })
}
