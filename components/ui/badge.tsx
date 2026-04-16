import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border border-primary text-primary",
        success: "border border-transparent bg-emerald-500 text-white hover:bg-emerald-600",
        warning: "border border-transparent bg-amber-500 text-white hover:bg-amber-600",
        danger: "border border-transparent bg-red-500 text-white hover:bg-red-600",
        info: "border border-transparent bg-cyan-500 text-white hover:bg-cyan-600",
        muted: "border border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
        lg: "px-4 py-1.5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={badgeVariants({ variant, size, className })} {...props} />
  )
}

export { Badge, badgeVariants }
