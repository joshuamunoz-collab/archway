'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { EntityManager } from '@/components/dashboard/entity-manager'
import { UserManager } from '@/components/settings/user-manager'
import { CategoryManager } from '@/components/settings/category-manager'
import { PreferencesManager } from '@/components/settings/preferences-manager'
import { ActivityLog } from '@/components/settings/activity-log'
import { PropertyImporter } from '@/components/dashboard/property-importer'
import { PaymentsImporter } from '@/components/import/payments-importer'
import { ExpensesImporter } from '@/components/import/expenses-importer'
import { ErrorLogViewer } from '@/components/settings/error-log-viewer'

const TABS = [
  { value: 'entities',    label: 'Entities' },
  { value: 'users',       label: 'Users' },
  { value: 'categories',  label: 'Categories' },
  { value: 'preferences', label: 'Preferences' },
  { value: 'activity',    label: 'Activity' },
  { value: 'import',      label: 'Import' },
  { value: 'error-log',   label: 'Error Log' },
]

interface SettingsTabsProps {
  entities: any[]
  users: any[]
  categories: any[]
  preferences: any
  entityNames: string[]
}

export function SettingsTabs({
  entities,
  users,
  categories,
  preferences,
  entityNames,
}: SettingsTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') ?? 'entities'
  const [activeTab, setActiveTab] = useState(defaultTab)

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage entities, users, categories, preferences, and more.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-0 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer',
                activeTab === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'entities'    && <EntityManager initial={entities} />}
        {activeTab === 'users'       && <UserManager initial={users} />}
        {activeTab === 'categories'  && <CategoryManager initial={categories} />}
        {activeTab === 'preferences' && <PreferencesManager initial={preferences} />}
        {activeTab === 'activity'    && <ActivityLog />}
        {activeTab === 'import'      && (
          <div className="space-y-8">
            <section>
              <h2 className="text-base font-semibold mb-4 border-b pb-2">Properties</h2>
              <PropertyImporter entityNames={entityNames} />
            </section>
            <section>
              <h2 className="text-base font-semibold mb-4 border-b pb-2">Payments</h2>
              <PaymentsImporter />
            </section>
            <section>
              <h2 className="text-base font-semibold mb-4 border-b pb-2">Expenses</h2>
              <ExpensesImporter />
            </section>
          </div>
        )}
        {activeTab === 'error-log'   && <ErrorLogViewer />}
      </div>
    </div>
  )
}
