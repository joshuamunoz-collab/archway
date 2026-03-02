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
