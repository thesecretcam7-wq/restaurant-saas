import * as React from "react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  errorMessage?: string
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, errorMessage, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          className={`
            flex h-10 w-full rounded-lg border border-input bg-input px-3 py-2
            text-base text-foreground placeholder:text-muted-foreground
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-destructive focus:ring-destructive' : ''}
            ${className || ''}
          `}
          ref={ref}
          {...props}
        />
        {error && errorMessage && (
          <p className="text-xs text-destructive mt-1">{errorMessage}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
