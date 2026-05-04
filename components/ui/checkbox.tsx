import * as React from "react"
import { Check } from "lucide-react"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="flex items-start space-x-3">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className="sr-only"
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={`
              flex items-center justify-center
              h-5 w-5 rounded border-2 border-input bg-input
              cursor-pointer transition-all duration-200
              hover:border-ring
              focus:outline-none
              has-[:checked]:bg-primary has-[:checked]:border-primary
              has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed
              ${className || ''}
            `}
          >
            <Check className="h-3 w-3 text-primary-foreground opacity-0 has-[:checked]:opacity-100 transition-opacity" />
          </label>
        </div>
        {label && (
          <div className="flex flex-col">
            <label
              htmlFor={checkboxId}
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              {label}
            </label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
