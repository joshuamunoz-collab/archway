import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, daysFromNow } from '@/lib/format'
import type { PropertyDetailData } from '@/types/property'

export function OverviewTab({ data }: { data: PropertyDetailData }) {
  const { activeLease, ytdIncome, ytdExpenses, recentActivity } = data

  return (
    <div className="space-y-6">
      {/* Property Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Property Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <InfoField label="Type" value={data.propertyType?.replace('_', ' ') ?? '—'} />
            <InfoField label="Beds" value={data.beds?.toString() ?? '—'} />
            <InfoField label="Baths" value={data.baths?.toString() ?? '—'} />
            <InfoField label="Sq Ft" value={data.sqft?.toLocaleString() ?? '—'} />
            <InfoField label="Year Built" value={data.yearBuilt?.toString() ?? '—'} />
            <InfoField label="Parcel #" value={data.parcelNumber ?? '—'} />
            <InfoField label="Ward" value={data.ward ?? '—'} />
            <InfoField label="Neighborhood" value={data.neighborhood ?? '—'} />
            <InfoField label="Entity" value={data.entity.name} />
            <InfoField label="Section 8" value={data.isSection8 ? 'Yes' : 'No'} />
          </dl>
          {data.notes && (
            <div className="mt-4 text-sm text-muted-foreground border-t pt-4">
              <p className="font-medium text-foreground mb-1">Notes</p>
              <p>{data.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease Summary */}
      {activeLease ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Current Lease</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoField
                label="Tenant"
                value={`${activeLease.tenant.firstName} ${activeLease.tenant.lastName}`}
              />
              <InfoField label="Phone" value={activeLease.tenant.phone ?? '—'} />
              <InfoField label="Email" value={activeLease.tenant.email ?? '—'} />
              <InfoField label="Lease Start" value={formatDate(activeLease.startDate)} />
              <InfoField
                label="Lease End"
                value={activeLease.endDate ? formatDate(activeLease.endDate) : 'Month-to-month'}
                highlight={(() => {
                  if (!activeLease.endDate) return undefined
                  const d = daysFromNow(activeLease.endDate) ?? 99
                  return d <= 30 ? 'red' : d <= 60 ? 'amber' : undefined
                })()}
              />
              <InfoField label="Contract Rent" value={formatCurrency(activeLease.contractRent)} />
              {data.isSection8 && (
                <>
                  <InfoField label="HAP Amount" value={formatCurrency(activeLease.hapAmount)} />
                  <InfoField label="Tenant Copay" value={formatCurrency(activeLease.tenantCopay)} />
                  <InfoField
                    label="Recertification"
                    value={formatDate(activeLease.recertificationDate)}
                    highlight={(() => {
                      if (!activeLease.recertificationDate) return undefined
                      const d = daysFromNow(activeLease.recertificationDate) ?? 99
                      return d <= 30 ? 'red' : d <= 60 ? 'amber' : undefined
                    })()}
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No active lease</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="YTD Income" value={formatCurrency(ytdIncome)} />
        <StatCard label="YTD Expenses" value={formatCurrency(ytdExpenses)} />
        <StatCard
          label="YTD NOI"
          value={formatCurrency(ytdIncome - ytdExpenses)}
          highlight={ytdIncome - ytdExpenses < 0 ? 'red' : undefined}
        />
        {activeLease && (
          <StatCard
            label="Tenant Since"
            value={formatDate(activeLease.startDate)}
          />
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 10).map(entry => (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                  <span className="text-muted-foreground text-xs w-28 shrink-0 pt-0.5">
                    {new Date(entry.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: '2-digit',
                    })}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{formatAction(entry.action)}</span>
                    {entry.user && (
                      <span className="text-muted-foreground"> · {entry.user.fullName}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoField({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'red' | 'amber'
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground font-medium">{label}</dt>
      <dd className={`text-sm mt-0.5 ${highlight === 'red' ? 'text-red-600 font-medium' : highlight === 'amber' ? 'text-amber-600 font-medium' : 'text-foreground'}`}>
        {value}
      </dd>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'red'
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={`text-xl font-bold mt-0.5 tabular-nums ${highlight === 'red' ? 'text-red-600' : 'text-foreground'}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// Re-export Badge for use
export { Badge }
