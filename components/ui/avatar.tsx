import * as React from "react"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, fallback, size = "md", className, ...props }, ref) => {
    const [isLoaded, setIsLoaded] = React.useState(false)

    return (
      <div
        ref={ref}
        className={`
          relative inline-flex items-center justify-center
          rounded-full bg-primary text-primary-foreground font-semibold
          ${sizeClasses[size]}
          ${className || ""}
        `}
        {...props}
      >
        {src && (
          <img
            src={src}
            alt={alt || "avatar"}
            className={`h-full w-full rounded-full object-cover transition-opacity ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setIsLoaded(true)}
          />
        )}
        {(!src || !isLoaded) && (
          <span className="flex items-center justify-center h-full w-full">
            {fallback}
          </span>
        )}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

export { Avatar }
