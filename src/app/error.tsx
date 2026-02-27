'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App Error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-sm border text-center space-y-4">
        <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {error?.message || 'An unexpected error occurred loading this page.'}
        </p>
        {error?.digest && (
          <p className="text-xs text-muted-foreground font-mono">digest: {error.digest}</p>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
          <Button size="sm" onClick={reset}>
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}
