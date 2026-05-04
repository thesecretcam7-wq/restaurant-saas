import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

const cardVariants = cva("rounded-lg border border-border bg-card text-card-foreground transition-all", {
  variants: {
    variant: {
      default: "shadow-sm hover:shadow-md",
      elevated: "shadow-md hover:shadow-lg",
      bordered: "border-2 border-border",
      ghost: "border-0 shadow-none",
      outline: "border-2 bg-background",
    },
    interactive: {
      true: "cursor-pointer hover:bg-muted active:scale-[0.98]",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    interactive: false,
  },
})

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cardVariants({ variant, interactive, className })}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 p-6 ${className || ""}`}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center p-6 pt-0 ${className || ""}`}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-2xl font-bold leading-none tracking-tight ${className || ""}`}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-muted-foreground ${className || ""}`}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`p-6 pt-0 ${className || ""}`}
    {...props}
  />
))
CardContent.displayName = "CardContent"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
}
