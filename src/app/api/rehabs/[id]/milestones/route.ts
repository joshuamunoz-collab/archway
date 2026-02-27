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

  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  // Get current max sort order
  const maxSort = await prisma.rehabMilestone.aggregate({
    where: { rehabProjectId: id },
    _max: { sortOrder: true },
  })

  const milestone = await prisma.rehabMilestone.create({
    data: {
      rehabProjectId: id,
      name: body.name.trim(),
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      status: 'pending',
      notes: body.notes?.trim() || null,
    },
  })

  return NextResponse.json(milestone, { status: 201 })
}
