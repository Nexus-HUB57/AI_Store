import { Skeleton } from '@/components/ui/skeleton'

export default function PublishLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg bg-zinc-800" />
            <Skeleton className="w-40 h-5 bg-zinc-800" />
          </div>
          <Skeleton className="w-28 h-6 rounded-full bg-zinc-800" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-zinc-900 border border-zinc-800/50" />
          ))}
        </div>
        <div className="flex gap-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-36 rounded-lg bg-zinc-800" />
          ))}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 bg-zinc-800" />
            <Skeleton className="h-4 w-72 bg-zinc-800" />
          </div>
          <Skeleton className="h-40 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/30" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24 bg-zinc-800" />
                <Skeleton className="h-9 w-full rounded-lg bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}