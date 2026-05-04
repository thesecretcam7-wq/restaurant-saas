import * as React from "react"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  color?: "primary" | "secondary" | "success" | "warning" | "danger"
  showLabel?: boolean
  animated?: boolean
  size?: "sm" | "md" | "lg"
}

const colorClasses = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
}

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      color = "primary",
      showLabel = false,
      animated = true,
      size = "md",
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div className="w-full">
        <div
          ref={ref}
          className={`
            relative w-full overflow-hidden rounded-full bg-muted
            ${sizeClasses[size]}
            ${className || ''}
          `}
          {...props}
        >
          <div
            className={`
              h-full transition-all duration-300 ease-out
              ${colorClasses[color]}
              ${animated ? 'animate-pulse-soft' : ''}
            `}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round(percentage)}%
          </p>
        )}
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
