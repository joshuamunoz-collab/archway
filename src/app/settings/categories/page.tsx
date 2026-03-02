export const dynamic = 'force-dynamic'
export const metadata = { title: 'Categories — Archway' }

import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'
import { CategoryManager } from '@/components/settings/category-manager'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@/lib/expense-categories'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const caller = await prisma.userProfile.findUnique({ where: { id: user.id } })
  if (!caller || caller.role !== 'admin') redirect('/dashboard')

  const pref = await prisma.systemPreference.findUnique({
    where: { key: 'expense_categories' },
  })

  const categories = pref
    ? (pref.value as unknown as ExpenseCategory[])
    : EXPENSE_CATEGORIES

  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-3xl">
        <CategoryManager initial={categories} />
      </div>
    </AppShell>
  )
}
