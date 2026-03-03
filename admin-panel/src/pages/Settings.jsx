import { useState } from 'react'
import {
  Building2,
  Users,
  Tag,
  Sliders,
  Clock,
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
} from 'lucide-react'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { ErrorLog } from './ErrorLog'

const tabs = [
  { key: 'entities', label: 'Entities', icon: Building2 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'categories', label: 'Categories', icon: Tag },
  { key: 'preferences', label: 'Preferences', icon: Sliders },
  { key: 'activity', label: 'Activity', icon: Clock },
  { key: 'import', label: 'Import', icon: Upload },
  { key: 'errorlog', label: 'Error Log', icon: AlertTriangle },
]

export function Settings() {
  const [activeTab, setActiveTab] = useState('entities')

  return (
    <div>
      <h1 className="text-2xl font-semibold" style={{ color: '#f0f1f4' }}>
        Settings
      </h1>
      <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
        Manage your system configuration and preferences.
      </p>

      {/* Tab bar */}
      <div
        className="mt-6 flex gap-1 p-1 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
            style={{
              background: activeTab === key ? 'rgba(79,110,247,0.12)' : 'transparent',
              color: activeTab === key ? '#8ba3f9' : '#6b7280',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== key) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            }}
            onMouseLeave={(e) => {
              if (activeTab !== key) e.currentTarget.style.background = 'transparent'
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'entities' && <EntitiesTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'import' && <ImportTab />}
        {activeTab === 'errorlog' && <ErrorLog embedded />}
      </div>
    </div>
  )
}

/* ========== Entities Tab ========== */
const entities = [
  { name: 'Organization', records: 24, status: 'active' },
  { name: 'Department', records: 18, status: 'active' },
  { name: 'Product Line', records: 9, status: 'draft' },
  { name: 'Region', records: 12, status: 'active' },
]

function EntitiesTab() {
  return (
    <div className="flex flex-col gap-3">
      {entities.map((ent) => (
        <div
          key={ent.name}
          className="rounded-xl px-5 py-4 flex items-center justify-between transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <div className="text-sm font-medium" style={{ color: '#f0f1f4' }}>
              {ent.name}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              {ent.records} records
            </div>
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background:
                ent.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              color: ent.status === 'active' ? '#10b981' : '#f59e0b',
            }}
          >
            {ent.status === 'active' ? 'Active' : 'Draft'}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ========== Users Tab ========== */
const users = [
  { name: 'Josh Munoz', email: 'josh@system.io', role: 'Admin', initial: 'J', gradient: 'linear-gradient(135deg, #4f6ef7, #7c3aed)' },
  { name: 'Sarah Chen', email: 'sarah@system.io', role: 'Editor', initial: 'S', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { name: 'Alex Rivera', email: 'alex@system.io', role: 'Viewer', initial: 'A', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { name: 'Maria Lopez', email: 'maria@system.io', role: 'Editor', initial: 'M', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
]

const roleBadge = {
  Admin: { color: '#4f6ef7', bg: 'rgba(79,110,247,0.15)' },
  Editor: { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  Viewer: { color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
}

function UsersTab() {
  return (
    <div className="flex flex-col gap-3">
      {users.map((u) => (
        <div
          key={u.email}
          className="rounded-xl px-5 py-4 flex items-center gap-4 transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
            style={{ background: u.gradient }}
          >
            {u.initial}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: '#f0f1f4' }}>
              {u.name}
            </div>
            <div className="text-xs" style={{ color: '#6b7280' }}>
              {u.email}
            </div>
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background: roleBadge[u.role].bg,
              color: roleBadge[u.role].color,
            }}
          >
            {u.role}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ========== Categories Tab ========== */
const categories = [
  { name: 'Finance', items: 32, color: '#4f6ef7' },
  { name: 'Operations', items: 28, color: '#10b981' },
  { name: 'Marketing', items: 15, color: '#f59e0b' },
  { name: 'Engineering', items: 41, color: '#ef4444' },
]

function CategoriesTab() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((cat) => (
        <div
          key={cat.name}
          className="rounded-xl px-5 py-4 flex items-center gap-3 transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: cat.color }}
          />
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: '#f0f1f4' }}>
              {cat.name}
            </div>
          </div>
          <span className="text-xs" style={{ color: '#6b7280' }}>
            {cat.items} items
          </span>
        </div>
      ))}
    </div>
  )
}

/* ========== Preferences Tab ========== */
const preferences = [
  { key: 'dark', label: 'Dark Mode', description: 'Use dark theme across the application', defaultOn: true },
  { key: 'email', label: 'Email Notifications', description: 'Receive email alerts for important events', defaultOn: true },
  { key: 'autosave', label: 'Auto-save', description: 'Automatically save changes as you work', defaultOn: false },
  { key: 'compact', label: 'Compact View', description: 'Reduce spacing for a denser layout', defaultOn: false },
]

function PreferencesTab() {
  return (
    <div className="flex flex-col gap-3">
      {preferences.map((pref) => (
        <div
          key={pref.key}
          className="rounded-xl px-5 py-4 flex items-center justify-between transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <div className="text-sm font-medium" style={{ color: '#f0f1f4' }}>
              {pref.label}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              {pref.description}
            </div>
          </div>
          <ToggleSwitch defaultOn={pref.defaultOn} />
        </div>
      ))}
    </div>
  )
}

/* ========== Activity Tab ========== */
const activities = [
  { action: 'User login', user: 'Josh Munoz', time: '2 minutes ago', icon: Users },
  { action: 'Category updated', user: 'Sarah Chen', time: '15 minutes ago', icon: Tag },
  { action: 'Data imported', user: 'Alex Rivera', time: '1 hour ago', icon: Upload },
  { action: 'User invited', user: 'Maria Lopez', time: '3 hours ago', icon: Users },
]

function ActivityTab() {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div
        className="absolute left-5 top-6 bottom-6 w-px"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      />

      <div className="flex flex-col gap-4">
        {activities.map((act, i) => (
          <div key={i} className="flex items-start gap-4 pl-1">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 relative z-10"
              style={{
                background: 'rgba(79,110,247,0.12)',
                border: '2px solid #13161e',
              }}
            >
              <act.icon size={14} style={{ color: '#4f6ef7' }} />
            </div>
            <div
              className="flex-1 rounded-xl px-4 py-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: '#f0f1f4' }}>
                  {act.action}
                </span>
                <span className="text-xs" style={{ color: '#4b5563' }}>
                  {act.time}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                by {act.user}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ========== Import Tab ========== */
const recentImports = [
  { name: 'users_march.csv', date: 'Mar 4, 2026', rows: 1247, status: 'completed' },
  { name: 'categories.xlsx', date: 'Mar 3, 2026', rows: 89, status: 'completed' },
  { name: 'transactions.json', date: 'Mar 2, 2026', rows: 3421, status: 'completed' },
]

function ImportTab() {
  const [dragging, setDragging] = useState(false)

  return (
    <div>
      {/* Drop zone */}
      <div
        className="rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all duration-150 cursor-pointer"
        style={{
          background: dragging ? 'rgba(79,110,247,0.08)' : 'rgba(255,255,255,0.03)',
          border: dragging
            ? '2px dashed rgba(79,110,247,0.4)'
            : '2px dashed rgba(255,255,255,0.1)',
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(79,110,247,0.1)' }}
        >
          <Upload size={24} style={{ color: '#4f6ef7' }} />
        </div>
        <div className="text-sm font-medium" style={{ color: '#f0f1f4' }}>
          Drag & drop files here
        </div>
        <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
          Supports CSV, XLSX, JSON — max 10MB
        </div>
      </div>

      {/* Recent imports */}
      <h3 className="text-sm font-medium mt-8 mb-3" style={{ color: '#f0f1f4' }}>
        Recent Imports
      </h3>
      <div className="flex flex-col gap-2">
        {recentImports.map((imp) => (
          <div
            key={imp.name}
            className="rounded-xl px-5 py-3 flex items-center gap-4 transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <FileText size={16} style={{ color: '#6b7280' }} />
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: '#f0f1f4' }}>
                {imp.name}
              </div>
              <div className="text-xs" style={{ color: '#6b7280' }}>
                {imp.date}
              </div>
            </div>
            <span className="text-xs" style={{ color: '#6b7280' }}>
              {imp.rows.toLocaleString()} rows
            </span>
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#10b981' }}>
              <CheckCircle size={12} />
              Completed
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
