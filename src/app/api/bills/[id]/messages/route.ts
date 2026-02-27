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

  const { id: billId } = await params
  const { message } = await request.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const msg = await prisma.pmBillMessage.create({
    data: { billId, userId: user.id, message: message.trim() },
    include: { user: { select: { fullName: true } } },
  })

  return NextResponse.json({
    ...msg,
    createdAt: msg.createdAt.toISOString(),
  }, { status: 201 })
}
