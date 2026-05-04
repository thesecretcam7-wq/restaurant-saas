'use client'

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-2">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 flex-1 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders skeleton */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
