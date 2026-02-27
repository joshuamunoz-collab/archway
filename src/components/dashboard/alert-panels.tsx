import Link from 'next/link'
import { AlertCircle, AlertTriangle, Clock, FileWarning } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getVacancyDays, getVacancyUrgency } from '@/lib/vacancy'
import { formatDate, daysFromNow } from '@/lib/format'
import { cn } from '@/lib/utils'

interface VacantProperty {
  id: string
  addressLine1: string
  vacantSince: string | null
  entityName: string
}

interface OpenNotice {
  id: string
  propertyId: string
  propertyAddress: string
  noticeType: string | null
  description: string
  deadline: string | null
  status: string
}

interface ExpiringLease {
  id: string
  propertyId: string
  propertyAddress: string
  tenantName: string
  endDate: string
}

interface AlertPanelsProps {
  highRiskVacant: VacantProperty[]    // 45+ days
  watchVacant: VacantProperty[]       // 30–44 days
  openNotices: OpenNotice[]
  expiringLeases: ExpiringLease[]
}

export function AlertPanels({
  highRiskVacant,
  watchVacant,
  openNotices,
  expiringLeases,
}: AlertPanelsProps) {
  const hasRedAlerts = highRiskVacant.length > 0 || openNotices.filter(n => n.status === 'overdue').length > 0
  const hasYellowAlerts = watchVacant.length > 0 || expiringLeases.length > 0 || openNotices.filter(n => n.status !== 'overdue').length > 0

  if (!hasRedAlerts && !hasYellowAlerts) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-emerald-600 font-medium">All clear — no alerts</p>
          <p className="text-xs text-muted-foreground mt-1">No vacancy risks, overdue notices, or expiring leases</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Red: Needs Immediate Attention */}
      {hasRedAlerts && (
        <Card className="border-red-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Needs Immediate Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {highRiskVacant.map(p => {
              const days = getVacancyDays(p.vacantSince)
              const urgency = getVacancyUrgency(days)
              return (
                <Link
                  key={p.id}
                  href={`/properties/${p.id}?tab=insurance`}
                  className="flex items-center gap-2 rounded-md border p-2.5 hover:bg-secondary/40 transition-colors text-sm"
                >
                  <span className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    urgency === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                  )} />
                  <span className="flex-1 font-medium truncate">{p.addressLine1}</span>
                  <span className={cn(
                    'text-xs font-semibold tabular-nums shrink-0',
                    urgency === 'critical' ? 'text-red-600' : 'text-orange-600'
                  )}>
                    {days}d vacant
                  </span>
                </Link>
              )
            })}
            {openNotices.filter(n => n.status === 'overdue').map(notice => (
              <Link
                key={notice.id}
                href={`/properties/${notice.propertyId}?tab=compliance`}
                className="flex items-center gap-2 rounded-md border border-red-200 p-2.5 hover:bg-red-50 transition-colors text-sm"
              >
                <FileWarning className="h-4 w-4 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{notice.propertyAddress}</p>
                  <p className="text-xs text-muted-foreground truncate">{notice.noticeType || 'City Notice'}</p>
                </div>
                <Badge variant="destructive" className="text-xs shrink-0">Overdue</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Yellow: Watch List */}
      {hasYellowAlerts && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Watch List
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {watchVacant.map(p => {
              const days = getVacancyDays(p.vacantSince)
              return (
                <Link
                  key={p.id}
                  href={`/properties/${p.id}?tab=insurance`}
                  className="flex items-center gap-2 rounded-md border border-amber-200 p-2.5 hover:bg-amber-50/50 transition-colors text-sm"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="flex-1 font-medium truncate">{p.addressLine1}</span>
                  <span className="text-xs font-medium text-amber-600 tabular-nums shrink-0">{days}d vacant</span>
                </Link>
              )
            })}
            {expiringLeases.map(lease => {
              const daysLeft = daysFromNow(lease.endDate) ?? 0
              return (
                <Link
                  key={lease.id}
                  href={`/properties/${lease.propertyId}?tab=overview`}
                  className="flex items-center gap-2 rounded-md border p-2.5 hover:bg-secondary/40 transition-colors text-sm"
                >
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lease.propertyAddress}</p>
                    <p className="text-xs text-muted-foreground truncate">{lease.tenantName}</p>
                  </div>
                  <span className="text-xs text-amber-600 font-medium shrink-0">
                    Lease ends {formatDate(lease.endDate)}
                  </span>
                </Link>
              )
            })}
            {openNotices.filter(n => n.status !== 'overdue').map(notice => (
              <Link
                key={notice.id}
                href={`/properties/${notice.propertyId}?tab=compliance`}
                className="flex items-center gap-2 rounded-md border p-2.5 hover:bg-secondary/40 transition-colors text-sm"
              >
                <FileWarning className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{notice.propertyAddress}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {notice.noticeType || 'City Notice'}
                    {notice.deadline ? ` · due ${formatDate(notice.deadline)}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
