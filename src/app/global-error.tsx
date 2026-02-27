'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ fontFamily: 'Inter, sans-serif', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ maxWidth: 480, padding: '2rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1A1A1A' }}>Something went wrong</h1>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error?.message || 'An unexpected server error occurred.'}
          </p>
          {error?.digest && (
            <p style={{ color: '#9CA3AF', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '1rem' }}>
              Error digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
