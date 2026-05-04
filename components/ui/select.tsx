import * as React from "react"
import { ChevronDown } from "lucide-react"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: boolean
  errorMessage?: string
  options?: Array<{ value: string; label: string }>
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, errorMessage, options, children, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            appearance-none w-full px-3 py-2 pr-10 rounded-lg border border-input bg-input
            text-base text-foreground placeholder:text-muted-foreground
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-destructive focus:ring-destructive' : ''}
            ${className || ''}
          `}
          ref={ref}
          {...props}
        >
          {children ||
            options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
      {error && errorMessage && (
        <p className="text-xs text-destructive mt-1">{errorMessage}</p>
      )}
    </div>
  )
)
Select.displayName = "Select"

export { Select }
