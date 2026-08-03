import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg bg-zinc-800" />
            <Skeleton className="w-32 h-5 bg-zinc-800" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-lg bg-zinc-800" />
            <Skeleton className="w-28 h-9 rounded-lg bg-zinc-800" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Back + title skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg bg-zinc-800" />
          <Skeleton className="h-7 w-48 bg-zinc-800" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="w-8 h-8 rounded-lg bg-zinc-800" />
                <Skeleton className="h-3 w-12 bg-zinc-800" />
              </div>
              <Skeleton className="h-7 w-24 bg-zinc-800" />
              <Skeleton className="h-3 w-20 bg-zinc-800" />
            </div>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="space-y-4">
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-lg bg-zinc-800" />
            ))}
          </div>
          {/* Tab content skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg bg-zinc-800" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                    <Skeleton className="h-3 w-1/2 bg-zinc-800" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}