import { Skeleton } from '@/components/ui/skeleton'

export default function HomeLoading() {  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg bg-zinc-800" />
            <Skeleton className="w-32 h-5 bg-zinc-800" />
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Skeleton className="w-64 h-9 rounded-lg bg-zinc-800" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-lg bg-zinc-800" />
            <Skeleton className="w-9 h-9 rounded-lg bg-zinc-800" />
            <Skeleton className="w-28 h-9 rounded-lg bg-zinc-800" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Stats bar skeleton */}
        <div className="flex items-center gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded bg-zinc-800" />
              <Skeleton className="w-16 h-4 bg-zinc-800" />
            </div>
          ))}
        </div>

        {/* Featured skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl bg-zinc-900 border border-zinc-800/50" />
          ))}
        </div>

        {/* Category chips skeleton */}
        <div className="flex gap-2 flex-wrap">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-full bg-zinc-800" />
          ))}
        </div>

        {/* Product grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="w-10 h-10 rounded-lg bg-zinc-800" />
                <Skeleton className="w-14 h-5 rounded-full bg-zinc-800" />
              </div>
              <Skeleton className="h-5 w-3/4 bg-zinc-800" />
              <Skeleton className="h-3 w-full bg-zinc-800" />
              <Skeleton className="h-3 w-2/3 bg-zinc-800" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-4 w-16 bg-zinc-800" />
                <Skeleton className="h-8 w-20 rounded-lg bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}