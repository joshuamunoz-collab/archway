import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  occupied:           { label: 'Occupied',           className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  vacant:             { label: 'Vacant',             className: 'bg-red-100 text-red-700 border-red-200' },
  rehab:              { label: 'Rehab',              className: 'bg-orange-100 text-orange-700 border-orange-200' },
  pending_inspection: { label: 'Pending Inspection', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  pending_packet:     { label: 'Pending Packet',     className: 'bg-amber-100 text-amber-700 border-amber-200' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
