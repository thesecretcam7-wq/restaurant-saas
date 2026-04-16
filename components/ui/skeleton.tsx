import * as React from "react"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circle" | "rectangular" | "rounded"
  width?: string | number
  height?: string | number
  count?: number
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = "rectangular",
      width,
      height,
      count = 1,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      text: "rounded-sm h-4 w-full mb-2",
      circle: "rounded-full",
      rectangular: "rounded",
      rounded: "rounded-lg",
    }

    const style: React.CSSProperties = {
      ...(width && { width: typeof width === "number" ? `${width}px` : width }),
      ...(height && {
        height: typeof height === "number" ? `${height}px` : height,
      }),
    }

    const skeletons = Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        ref={i === 0 ? ref : undefined}
        className={`
          animate-pulse bg-gradient-to-r from-muted to-muted/50
          ${variantClasses[variant]}
          ${i < count - 1 ? "mb-2" : ""}
          ${className || ""}
        `}
        style={style}
        {...props}
      />
    ))

    return count === 1 ? skeletons[0] : <div className="space-y-2">{skeletons}</div>
  }
)
Skeleton.displayName = "Skeleton"

export { Skeleton }
