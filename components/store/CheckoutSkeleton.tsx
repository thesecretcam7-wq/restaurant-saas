'use client'

export function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Order summary skeleton */}
        <div className="bg-white rounded-lg p-4 space-y-4 border border-gray-200">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex justify-between items-center pb-3 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex-1">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Form skeleton */}
        <div className="bg-white rounded-lg p-4 space-y-4 border border-gray-200">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />

          {/* Name field */}
          <div>
            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
          </div>

          {/* Phone field */}
          <div>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
          </div>

          {/* Email field */}
          <div>
            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
          </div>

          {/* Delivery type */}
          <div>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="flex gap-2">
              <div className="h-10 flex-1 bg-gray-100 rounded animate-pulse" />
              <div className="h-10 flex-1 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>

          {/* Address field */}
          <div>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-20 bg-gray-100 rounded animate-pulse" />
          </div>

          {/* Payment method */}
          <div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* Submit button skeleton */}
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
