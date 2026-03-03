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
  Settings,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

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
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  pm: 'PM',
  pm_staff: 'PM Staff',
}

const activeStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.1)',
  color: '#FFFFFF',
  borderLeft: '3px solid #4F8EF7',
  paddingLeft: '9px',
  transition: 'all 0.15s ease',
}

const idleStyle: React.CSSProperties = {
  color: '#9CA3AF',
  borderLeft: '3px solid transparent',
  paddingLeft: '9px',
  transition: 'all 0.15s ease',
}

const hoverIn = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
  e.currentTarget.style.color = '#FFFFFF'
}

const hoverOut = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.backgroundColor = 'transparent'
  e.currentTarget.style.color = '#9CA3AF'
}

interface SidebarProps {
  userName: string
  userRole: string
  logoUrl?: string
}

export function Sidebar({ userName, userRole, logoUrl }: SidebarProps) {
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
    <aside
      className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col"
      style={{ backgroundColor: '#1A1A2E', color: '#FFFFFF' }}
    >
      {/* Wordmark */}
      <div className="h-14 flex items-center gap-2 px-5 shrink-0">
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Company logo"
            className="h-8 object-contain"
            style={{ backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '2px' }}
          />
        )}
        <span className="text-base font-semibold tracking-tight" style={{ color: '#FFFFFF' }}>
          Archway
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md py-2 text-sm',
                active ? 'font-medium' : ''
              )}
              style={active ? activeStyle : idleStyle}
              onMouseEnter={active ? undefined : hoverIn}
              onMouseLeave={active ? undefined : hoverOut}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Settings link */}
        <div className="pt-1">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 rounded-md py-2 text-sm',
              isSettingsActive ? 'font-medium' : ''
            )}
            style={isSettingsActive ? activeStyle : idleStyle}
            onMouseEnter={isSettingsActive ? undefined : hoverIn}
            onMouseLeave={isSettingsActive ? undefined : hoverOut}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
            <ChevronRight
              className="h-3 w-3 ml-auto"
              style={{ color: isSettingsActive ? '#FFFFFF' : '#6B7280' }}
            />
          </Link>
        </div>
      </nav>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />

      {/* User + sign out */}
      <div className="p-3 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#2563EB' }}
          >
            <span className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>
              {(userName?.[0] ?? 'U').toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate" style={{ color: '#FFFFFF' }}>{userName}</p>
            <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
              {ROLE_LABELS[userRole] ?? userRole}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="cursor-pointer"
            style={{ fontSize: 11, color: '#6B7280', transition: 'color 0.15s ease' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#EF4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#6B7280'
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
