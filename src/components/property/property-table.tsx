'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PropertyRow {
  id: string
  addressLine1: string
  addressLine2: string | null
  status: string
  entityName: string
  isSection8: boolean
  propertyType: string | null
  beds: number | null
  baths: number | null
  neighborhood: string | null
  ward: string | null
  vacantSince: string | null  // ISO date string
}

// ── Vacancy helpers ───────────────────────────────────────────────────────────

function daysVacant(vacantSince: string): number {
  return Math.floor((Date.now() - new Date(vacantSince).getTime()) / 86_400_000)
}

function vacancyUrgencyClass(days: number): string {
  if (days >= 60) return 'text-red-600 font-semibold'
  if (days >= 45) return 'text-orange-600 font-semibold'
  if (days >= 30) return 'text-amber-600 font-medium'
  return 'text-muted-foreground'
}

// ── Column sort icon ──────────────────────────────────────────────────────────

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (!sorted) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />
  if (sorted === 'asc') return <ArrowUp className="h-3.5 w-3.5 ml-1" />
  return <ArrowDown className="h-3.5 w-3.5 ml-1" />
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PropertyTable({
  data,
  entityNames,
}: {
  data: PropertyRow[]
  entityNames: string[]
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'addressLine1', desc: false }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo<ColumnDef<PropertyRow>[]>(
    () => [
      {
        accessorKey: 'addressLine1',
        header: ({ column }) => (
          <button
            className="flex items-center text-left"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Address
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-foreground">{row.original.addressLine1}</span>
            {row.original.addressLine2 && (
              <span className="text-muted-foreground"> {row.original.addressLine2}</span>
            )}
          </div>
        ),
        enableGlobalFilter: true,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <button
            className="flex items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
        filterFn: 'equals',
        enableGlobalFilter: false,
      },
      {
        accessorKey: 'entityName',
        header: ({ column }) => (
          <button
            className="flex items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Entity
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{getValue() as string}</span>
        ),
        filterFn: 'equals',
        enableGlobalFilter: false,
      },
      {
        id: 'sec8',
        accessorKey: 'isSection8',
        header: 'Sec 8',
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="text-xs font-medium text-primary">Yes</span>
          ) : (
            <span className="text-xs text-muted-foreground">No</span>
          ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        id: 'beds_baths',
        header: 'Bed / Bath',
        accessorFn: row => `${row.beds ?? '—'} / ${row.baths ?? '—'}`,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground tabular-nums">{getValue() as string}</span>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        id: 'vacancy',
        header: 'Vacant',
        accessorFn: row => (row.vacantSince ? daysVacant(row.vacantSince) : null),
        cell: ({ row }) => {
          if (!row.original.vacantSince) return null
          const days = daysVacant(row.original.vacantSince)
          return (
            <span className={cn('text-sm tabular-nums', vacancyUrgencyClass(days))}>
              {days}d
            </span>
          )
        },
        sortingFn: (a, b) => {
          const da = a.original.vacantSince ? daysVacant(a.original.vacantSince) : -1
          const db = b.original.vacantSince ? daysVacant(b.original.vacantSince) : -1
          return da - db
        },
        enableGlobalFilter: false,
      },
      {
        id: 'neighborhood',
        accessorKey: 'neighborhood',
        header: 'Neighborhood',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{(getValue() as string | null) ?? '—'}</span>
        ),
        enableSorting: true,
        enableGlobalFilter: false,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Link href={`/properties/${row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  })

  const rows = table.getRowModel().rows
  const totalVacant = data.filter(p => p.status === 'vacant').length

  const activeStatus = (columnFilters.find(f => f.id === 'status')?.value as string) ?? ''
  const activeEntity = (columnFilters.find(f => f.id === 'entityName')?.value as string) ?? ''

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Properties</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.length} properties · {totalVacant} vacant
          </p>
        </div>
        <Link href="/import">
          <Button size="sm" variant="outline">Import CSV</Button>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by address…"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Status filter */}
        <Select
          value={activeStatus}
          onValueChange={v => {
            setColumnFilters(prev =>
              v === '__all__'
                ? prev.filter(f => f.id !== 'status')
                : [...prev.filter(f => f.id !== 'status'), { id: 'status', value: v }]
            )
          }}
        >
          <SelectTrigger className="h-8 text-sm w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="vacant">Vacant</SelectItem>
            <SelectItem value="rehab">Rehab</SelectItem>
            <SelectItem value="pending_inspection">Pending Inspection</SelectItem>
            <SelectItem value="pending_packet">Pending Packet</SelectItem>
          </SelectContent>
        </Select>

        {/* Entity filter */}
        <Select
          value={activeEntity}
          onValueChange={v => {
            setColumnFilters(prev =>
              v === '__all__'
                ? prev.filter(f => f.id !== 'entityName')
                : [...prev.filter(f => f.id !== 'entityName'), { id: 'entityName', value: v }]
            )
          }}
        >
          <SelectTrigger className="h-8 text-sm w-48">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All entities</SelectItem>
            {entityNames.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {rows.length} of {data.length} shown
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary border-b border-border">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  {data.length === 0
                    ? 'No properties yet. Import a CSV to get started.'
                    : 'No properties match your filters.'}
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="hover:bg-secondary/40 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
