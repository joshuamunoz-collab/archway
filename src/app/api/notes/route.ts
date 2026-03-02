import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// ── Auto-category detection ─────────────────────────────────────────────────

const CATEGORY_KEYWORDS: [string, RegExp[]][] = [
  ['maintenance',      [/broken/i, /leak/i, /repair/i, /\bfix\b/i, /window/i, /hvac/i]],
  ['vacancy',          [/vacant/i, /move.?out/i, /listed/i]],
  ['insurance',        [/claim/i, /policy/i, /damage/i]],
  ['financial',        [/\brent\b/i, /payment/i, /deposit/i]],
  ['property_manager', [/\bpm\b/i, /contractor/i]],
]

function detectCategory(content: string): string {
  for (const [cat, patterns] of CATEGORY_KEYWORDS) {
    if (patterns.some(re => re.test(content))) return cat
  }
  return 'general'
}

// ── GET /api/notes ──────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('propertyId')
  const category = searchParams.get('category')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20') || 20))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (category) where.category = category
  if (propertyId) where.properties = { some: { propertyId } }

  const [notes, total] = await Promise.all([
    prisma.quickNote.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        properties: {
          include: {
            property: { select: { id: true, addressLine1: true } },
          },
        },
      },
    }),
    prisma.quickNote.count({ where }),
  ])

  const serialized = notes.map(n => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }))

  return NextResponse.json({
    notes: serialized,
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}

// ── POST /api/notes ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { content, category, properties } = body as {
    content?: string
    category?: string
    properties?: { propertyId: string; mentionText: string }[]
  }

  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const resolvedCategory = category || detectCategory(content)

  const note = await prisma.quickNote.create({
    data: {
      content: content.trim(),
      category: resolvedCategory,
      authorId: auth.user.id,
      properties:
        properties && properties.length > 0
          ? {
              create: properties.map(p => ({
                propertyId: p.propertyId,
                mentionText: p.mentionText,
              })),
            }
          : undefined,
    },
    include: {
      author: { select: { id: true, fullName: true, email: true } },
      properties: {
        include: {
          property: { select: { id: true, addressLine1: true } },
        },
      },
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'quick_note',
      entityId: note.id,
      action: 'note_created',
      details: { category: resolvedCategory, propertyCount: properties?.length ?? 0 },
      userId: auth.user.id,
    },
  })

  return NextResponse.json(
    {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    },
    { status: 201 },
  )
}
