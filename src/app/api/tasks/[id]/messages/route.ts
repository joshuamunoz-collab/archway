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

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const message = await prisma.pmTaskMessage.create({
    data: {
      taskId: id,
      userId: user.id,
      message: body.message.trim(),
    },
    include: { user: { select: { id: true, fullName: true } } },
  })

  return NextResponse.json(message, { status: 201 })
}
