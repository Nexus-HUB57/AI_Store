import { Skeleton } from '@/components/ui/skeleton'

export default function ProductLoading() {
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
            <Skeleton className="w-64 h-9 rounded-lg bg-zinc-800" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-lg bg-zinc-800" />
            <Skeleton className="w-28 h-9 rounded-lg bg-zinc-800" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Back button + breadcrumb */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg bg-zinc-800" />
          <Skeleton className="w-48 h-4 bg-zinc-800" />
        </div>

        {/* Product hero skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Product info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-16 h-16 rounded-2xl bg-zinc-800" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-72 bg-zinc-800" />
                  <Skeleton className="h-4 w-40 bg-zinc-800" />
                </div>
              </div>
              <Skeleton className="h-4 w-24 rounded-full bg-zinc-800" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-zinc-800" />
                <Skeleton className="h-4 w-5/6 bg-zinc-800" />
                <Skeleton className="h-4 w-2/3 bg-zinc-800" />
              </div>
            </div>

            {/* Stats grid skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl bg-zinc-900 border border-zinc-800/50" />
              ))}
            </div>
          </div>

          {/* Right: Purchase card skeleton */}
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-4">
              <Skeleton className="h-10 w-32 bg-zinc-800" />
              <Skeleton className="h-8 w-24 bg-zinc-800" />
              <Separator className="!bg-zinc-800" />
              <Skeleton className="h-10 w-full rounded-lg bg-zinc-800" />
              <Skeleton className="h-10 w-full rounded-lg bg-zinc-800" />
              <Skeleton className="h-4 w-48 bg-zinc-800" />
            </div>
          </div>
        </div>

        {/* Reviews skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 bg-zinc-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40 bg-zinc-800" />
                  <Skeleton className="h-4 w-20 bg-zinc-800" />
                </div>
                <Skeleton className="h-3 w-full bg-zinc-800" />
                <Skeleton className="h-3 w-3/4 bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function Separator({ className }: { className?: string }) {
  return <div className={className || 'h-px bg-zinc-800'} />
}
