import { FileBarChart } from 'lucide-react'

export function Reports() {
  return (
    <div>
      <h1 className="text-2xl font-semibold" style={{ color: '#f0f1f4' }}>
        Reports
      </h1>
      <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
        Generate and view system reports.
      </p>

      <div
        className="mt-6 rounded-xl p-12 flex flex-col items-center justify-center text-center"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(79,110,247,0.1)' }}
        >
          <FileBarChart size={24} style={{ color: '#4f6ef7' }} />
        </div>
        <h2 className="text-lg font-medium" style={{ color: '#f0f1f4' }}>
          Reports coming soon
        </h2>
        <p className="mt-1 text-sm max-w-sm" style={{ color: '#6b7280' }}>
          Analytics and detailed reports will be available here. Stay tuned for usage
          statistics, performance metrics, and exportable summaries.
        </p>
      </div>
    </div>
  )
}
