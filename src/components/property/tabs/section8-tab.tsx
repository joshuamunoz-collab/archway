import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, daysFromNow } from '@/lib/format'
import type { PropertyDetailData } from '@/types/property'
import { cn } from '@/lib/utils'

export function Section8Tab({ data }: { data: PropertyDetailData }) {
  const lease = data.activeLease

  if (!data.isSection8) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">This property is not designated as Section 8.</p>
        </CardContent>
      </Card>
    )
  }

  if (!lease) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">No active lease on file.</p>
        </CardContent>
      </Card>
    )
  }

  const recertDays = daysFromNow(lease.recertificationDate)
  const hapEndDays = daysFromNow(lease.hapContractEnd)

  return (
    <div className="space-y-6">
      {/* HAP Contract */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">HAP Contract</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoField label="Contract Rent" value={formatCurrency(lease.contractRent)} />
            <InfoField label="HAP Amount" value={formatCurrency(lease.hapAmount)} />
            <InfoField label="Tenant Copay" value={formatCurrency(lease.tenantCopay)} />
            <InfoField label="Utility Allowance" value={formatCurrency(lease.utilityAllowance)} />
            <InfoField label="Payment Standard" value={formatCurrency(lease.paymentStandard)} />
            <InfoField label="HAP Contract Start" value={formatDate(lease.hapContractStart)} />
            <InfoField
              label="HAP Contract End"
              value={formatDate(lease.hapContractEnd)}
              highlight={hapEndDays !== null && hapEndDays <= 60 ? (hapEndDays <= 30 ? 'red' : 'amber') : undefined}
            />
            <InfoField
              label="Recertification Date"
              value={lease.recertificationDate ? formatDate(lease.recertificationDate) : '—'}
              highlight={recertDays !== null && recertDays <= 60 ? (recertDays <= 30 ? 'red' : 'amber') : undefined}
            />
          </dl>
          {recertDays !== null && recertDays <= 60 && (
            <div className={cn(
              'mt-4 rounded-md border p-3 text-sm',
              recertDays <= 30 ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            )}>
              Recertification due in <strong>{recertDays}</strong> day{recertDays === 1 ? '' : 's'}
              {recertDays <= 30 ? ' — action required now' : ' — begin preparation'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voucher Holder / PHA Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Tenant &amp; PHA Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoField
              label="Tenant"
              value={`${lease.tenant.firstName} ${lease.tenant.lastName}`}
            />
            <InfoField label="Phone" value={lease.tenant.phone ?? '—'} />
            <InfoField label="Email" value={lease.tenant.email ?? '—'} />
            <InfoField label="Voucher Number" value={lease.tenant.voucherNumber ?? '—'} />
            <InfoField label="PHA Caseworker" value={lease.tenant.phaCaseworker ?? '—'} />
            <InfoField label="PHA Phone" value={lease.tenant.phaPhone ?? '—'} />
          </dl>
        </CardContent>
      </Card>

      {/* Lease Notes */}
      {lease.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{lease.notes}</p>
          </CardContent>
        </Card>
      )}
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
      <dd className={`text-sm mt-0.5 ${
        highlight === 'red' ? 'text-red-600 font-medium' :
        highlight === 'amber' ? 'text-amber-600 font-medium' :
        'text-foreground'
      }`}>
        {value}
      </dd>
    </div>
  )
}
