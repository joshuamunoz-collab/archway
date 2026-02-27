import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

/** Static sidebar shell used in loading.tsx files (no auth needed) */
export function LoadingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Static sidebar placeholder */}
      <aside className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col bg-white border-r border-border">
        <div className="h-14 flex items-center px-5 shrink-0">
          <span className="text-base font-semibold tracking-tight text-foreground">Archway</span>
        </div>
        <Separator />
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </nav>
        <Separator />
        <div className="p-3 shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </aside>
      <main className="ml-60 min-h-screen">
        {children}
      </main>
    </div>
  )
}
