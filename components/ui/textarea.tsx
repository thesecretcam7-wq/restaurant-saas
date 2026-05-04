import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  errorMessage?: string
  label?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, errorMessage, label, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}
      <textarea
        className={`
          flex min-h-[80px] w-full rounded-lg border border-input bg-input px-3 py-2
          text-base text-foreground placeholder:text-muted-foreground
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
          disabled:cursor-not-allowed disabled:opacity-50
          resize-none
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
)
Textarea.displayName = "Textarea"

export { Textarea }
