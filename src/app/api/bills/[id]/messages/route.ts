import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id: billId } = await params
  const { message } = await request.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const msg = await prisma.pmBillMessage.create({
    data: { billId, userId: auth.user.id, message: message.trim() },
    include: { user: { select: { fullName: true } } },
  })

  return NextResponse.json({
    ...msg,
    createdAt: msg.createdAt.toISOString(),
  }, { status: 201 })
}
