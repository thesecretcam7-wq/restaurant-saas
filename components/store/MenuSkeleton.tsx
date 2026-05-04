'use client'

interface MenuSkeletonProps {
  layout?: 'grid' | 'compact' | 'list'
  itemCount?: number
  categoryCount?: number
}

export function MenuSkeleton({ layout = 'grid', itemCount = 8, categoryCount = 3 }: MenuSkeletonProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header skeleton */}
      <header className="sticky top-0 z-20 bg-white/98 backdrop-blur-xl shadow-md border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
            <div>
              <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="w-12 h-3 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
        </div>

        {/* Category filter bar skeleton */}
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Featured section skeleton */}
        <section>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg bg-white border border-gray-100">
                <div className="h-32 w-full bg-gray-200 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
                    <div className="h-8 bg-gray-200 rounded animate-pulse flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories skeleton */}
        {[...Array(categoryCount)].map((_, catIdx) => (
          <section key={catIdx}>
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-3" />
            {layout === 'grid' ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(itemCount)].map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-lg bg-white border border-gray-100">
                    <div className="h-32 w-full bg-gray-200 animate-pulse" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                      <div className="flex gap-2 pt-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
                        <div className="h-8 bg-gray-200 rounded animate-pulse flex-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : layout === 'compact' ? (
              <div className="space-y-2 overflow-hidden rounded-lg border border-gray-100">
                {[...Array(itemCount)].map((_, i) => (
                  <div key={i} className="p-3 flex gap-3 border-b border-gray-50 last:border-0">
                    <div className="w-16 h-16 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...Array(itemCount)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  )
}
