import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@/lib/expense-categories'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pref = await prisma.systemPreference.findUnique({
    where: { key: 'expense_categories' },
  })

  const categories = pref ? (pref.value as unknown as ExpenseCategory[]) : EXPENSE_CATEGORIES

  return NextResponse.json(categories)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const caller = await prisma.userProfile.findUnique({ where: { id: user.id } })
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
      userId: user.id,
    },
  })

  return NextResponse.json(categories)
}
