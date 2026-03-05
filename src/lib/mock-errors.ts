export interface ErrorEntry {
  id: number
  message: string
  severity: 'error' | 'warning' | 'info'
  source: string
  status: 'open' | 'resolved'
  timestamp: string
}

export const mockErrors: ErrorEntry[] = [
  {
    id: 1,
    message: 'Failed to fetch user data: timeout after 30s',
    severity: 'error',
    source: 'API',
    status: 'resolved',
    timestamp: '2026-03-04T09:23:14Z',
  },
  {
    id: 2,
    message: 'Component render exceeded 16ms threshold',
    severity: 'warning',
    source: 'UI',
    status: 'resolved',
    timestamp: '2026-03-04T08:45:02Z',
  },
  {
    id: 3,
    message: 'Token refresh failed for session #a8f2c',
    severity: 'error',
    source: 'Auth',
    status: 'resolved',
    timestamp: '2026-03-03T22:11:47Z',
  },
  {
    id: 4,
    message: 'Query latency spike detected: 2.4s avg',
    severity: 'warning',
    source: 'Database',
    status: 'resolved',
    timestamp: '2026-03-04T07:58:33Z',
  },
  {
    id: 5,
    message: 'CSV parse error: unexpected delimiter at row 142',
    severity: 'error',
    source: 'Import',
    status: 'resolved',
    timestamp: '2026-03-03T16:30:21Z',
  },
  {
    id: 6,
    message: 'Scheduled maintenance completed successfully',
    severity: 'info',
    source: 'System',
    status: 'resolved',
    timestamp: '2026-03-03T04:00:00Z',
  },
  {
    id: 7,
    message: 'Rate limit exceeded for endpoint /v2/categories',
    severity: 'error',
    source: 'API',
    status: 'resolved',
    timestamp: '2026-03-04T10:05:19Z',
  },
  {
    id: 8,
    message: 'Memory usage exceeded 80% warning threshold',
    severity: 'warning',
    source: 'UI',
    status: 'resolved',
    timestamp: '2026-03-04T10:12:44Z',
  },
]

export function getOpenErrorCount(): number {
  return mockErrors.filter((e) => e.status === 'open').length
}
