import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileBarChart,
  Settings,
  AlertTriangle,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { getOpenErrorCount } from '../data/mockErrors'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', icon: Settings, hasArrow: true },
  { to: '/error-log', label: 'Error Log', icon: AlertTriangle, badge: true },
]

export function Sidebar() {
  const location = useLocation()
  const openErrors = getOpenErrorCount()

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col"
      style={{ width: 230, background: '#0f1219' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div
          className="w-7 h-7 rounded-md"
          style={{
            background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
          }}
        />
        <span className="text-sm font-semibold tracking-wide" style={{ color: '#f0f1f4' }}>
          System Panel
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2 flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, hasArrow, badge }) => {
          const isActive =
            location.pathname === to ||
            (to === '/settings' && location.pathname.startsWith('/settings'))

          return (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group"
              style={{
                background: isActive ? 'rgba(79,110,247,0.12)' : 'transparent',
                borderLeft: isActive ? '2px solid rgba(79,110,247,0.3)' : '2px solid transparent',
                color: isActive ? '#8ba3f9' : '#6b7280',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {badge && openErrors > 0 && (
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                  style={{ background: '#ef4444', color: '#fff', fontSize: 11 }}
                >
                  {openErrors}
                </span>
              )}
              {hasArrow && (
                <ChevronRight size={14} className="opacity-40" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User profile */}
      <div
        className="mx-3 mb-3 px-3 py-3 rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
            }}
          >
            J
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: '#f0f1f4' }}>
              Josh Munoz
            </div>
            <div className="text-xs" style={{ color: '#6b7280' }}>
              Admin
            </div>
          </div>
          <button
            className="transition-colors duration-150 cursor-pointer"
            style={{ color: '#4b5563', fontSize: 11 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#4b5563')}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
