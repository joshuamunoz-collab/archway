import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@/lib/expense-categories'

// ── In-memory cache for categories (avoids DB hit on every request) ──────────
let categoriesCache: ExpenseCategory[] | null = null
let categoriesCacheTime = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  // Return cached if fresh
  if (categoriesCache && Date.now() - categoriesCacheTime < CACHE_TTL_MS) {
    return NextResponse.json(categoriesCache, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    })
  }

  const pref = await prisma.systemPreference.findUnique({
    where: { key: 'expense_categories' },
  })

  const categories = pref ? (pref.value as unknown as ExpenseCategory[]) : EXPENSE_CATEGORIES

  // Update cache
  categoriesCache = categories
  categoriesCacheTime = Date.now()

  return NextResponse.json(categories, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  })
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const categories: ExpenseCategory[] = body.categories

  if (!Array.isArray(categories)) {
    return NextResponse.json({ error: 'Invalid categories format' }, { status: 400 })
  }

  // Validate structure
  for (const cat of categories) {
    if (!cat.value?.trim() || !cat.label?.trim()) {
      return NextResponse.json({ error: 'Each category needs a value and label' }, { status: 400 })
    }
    if (!Array.isArray(cat.subcategories)) {
      return NextResponse.json({ error: `Category "${cat.label}" must have a subcategories array` }, { status: 400 })
    }
  }

  const jsonValue = JSON.parse(JSON.stringify(categories)) as Prisma.InputJsonValue

  await prisma.systemPreference.upsert({
    where: { key: 'expense_categories' },
    create: { key: 'expense_categories', value: jsonValue },
    update: { value: jsonValue },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'system_preference',
      entityId: 'expense_categories',
      action: 'updated',
      details: { categoriesCount: categories.length },
      userId: auth.user.id,
    },
  })

  // Invalidate cache on update
  categoriesCache = categories
  categoriesCacheTime = Date.now()

  return NextResponse.json(categories)
}
