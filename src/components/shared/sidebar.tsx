'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  FileText,
  KanbanSquare,
  Hammer,
  DollarSign,
  BarChart3,
  Upload,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { label: 'Dashboard',   href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Properties',  href: '/properties',  icon: Building2 },
  { label: 'Tenants',     href: '/tenants',      icon: Users },
  { label: 'Tasks',       href: '/tasks',        icon: ClipboardList },
  { label: 'Bills',       href: '/bills',        icon: FileText },
  { label: 'Pipeline',    href: '/pipeline',     icon: KanbanSquare },
  { label: 'Rehabs',      href: '/rehabs',       icon: Hammer },
  { label: 'Financials',  href: '/financials',   icon: DollarSign },
  { label: 'Reports',     href: '/reports',      icon: BarChart3 },
  { label: 'Import',      href: '/import',       icon: Upload },
]

const settingsItems = [
  { label: 'Entities',    href: '/settings/entities' },
  { label: 'Users',       href: '/settings/users' },
  { label: 'Categories',  href: '/settings/categories' },
  { label: 'Preferences', href: '/settings/preferences' },
]

interface SidebarProps {
  userEmail: string
  userName: string
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isSettingsActive = pathname.startsWith('/settings')

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col bg-white border-r border-border">
      {/* Wordmark */}
      <div className="h-14 flex items-center px-5 shrink-0">
        <span className="text-base font-semibold tracking-tight text-foreground">Archway</span>
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Settings group */}
        <div className="pt-1">
          <div
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
              isSettingsActive
                ? 'text-foreground font-medium'
                : 'text-muted-foreground'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
            <ChevronRight className={cn('h-3 w-3 ml-auto transition-transform', isSettingsActive && 'rotate-90')} />
          </div>

          {isSettingsActive && (
            <div className="ml-7 mt-0.5 space-y-0.5">
              {settingsItems.map(({ label, href }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'block rounded-md px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      <Separator />

      {/* User + sign out */}
      <div className="p-3 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
