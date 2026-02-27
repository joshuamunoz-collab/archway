import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PropertyDetailData } from '@/types/property'

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    imported:             'Property imported',
    updated:              'Property updated',
    status_changed:       'Status changed',
    insurance_added:      'Insurance policy added',
    insurance_updated:    'Insurance policy updated',
    insurance_deleted:    'Insurance policy deleted',
    tax_record_added:     'Tax record added',
    tax_record_updated:   'Tax record updated',
    city_notice_added:    'City notice added',
    city_notice_updated:  'City notice updated',
    document_uploaded:    'Document uploaded',
    photo_uploaded:       'Photo uploaded',
  }
  return labels[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDetails(action: string, details: Record<string, unknown> | null): string | null {
  if (!details) return null
  if (action === 'status_changed') {
    return `${String(details.from)} → ${String(details.to)}`
  }
  if (action === 'insurance_added') {
    return [details.carrier, details.policyType].filter(Boolean).join(' · ')
  }
  return null
}

export function ActivityTab({ data }: { data: PropertyDetailData }) {
  const { recentActivity } = data

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No activity recorded yet.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4 ml-5">
              {recentActivity.map((entry, i) => (
                <div key={entry.id} className="relative">
                  {/* Dot */}
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-border border-2 border-background" />
                  <div>
                    <p className="text-sm font-medium">{formatAction(entry.action)}</p>
                    {formatDetails(entry.action, entry.details) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDetails(entry.action, entry.details)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(entry.createdAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                      {entry.user && ` · ${entry.user.fullName}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
