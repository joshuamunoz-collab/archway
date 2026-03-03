import { Users, Activity, Clock } from 'lucide-react'

const stats = [
  { label: 'Total Users', value: '1,247', delta: '+12.5%', icon: Users },
  { label: 'Active Sessions', value: '84', delta: '+4.2%', icon: Activity },
  { label: 'Uptime', value: '99.97%', delta: '+0.1%', icon: Clock },
]

export function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold" style={{ color: '#f0f1f4' }}>
        Dashboard
      </h1>
      <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
        Welcome back, Josh. Here&apos;s your system overview.
      </p>

      <div className="grid grid-cols-3 gap-5 mt-6">
        {stats.map(({ label, value, delta, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl p-5 transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: '#6b7280' }}>
                {label}
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(79,110,247,0.1)' }}
              >
                <Icon size={16} style={{ color: '#4f6ef7' }} />
              </div>
            </div>
            <div className="text-2xl font-semibold" style={{ color: '#f0f1f4' }}>
              {value}
            </div>
            <div className="mt-1 text-xs font-medium" style={{ color: '#10b981' }}>
              {delta} <span style={{ color: '#6b7280' }}>from last month</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
