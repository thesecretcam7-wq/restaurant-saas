import * as React from "react"
import { X } from "lucide-react"

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  closeButton?: boolean
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      size = "md",
      closeButton = true,
      className,
      ...props
    },
    ref
  ) => {
    React.useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden"
      } else {
        document.body.style.overflow = "unset"
      }

      return () => {
        document.body.style.overflow = "unset"
      }
    }, [isOpen])

    if (!isOpen) return null

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={ref}
            className={`
              relative w-full rounded-lg border border-border bg-card
              shadow-lg animate-scale-in
              ${sizeClasses[size]}
              ${className || ""}
            `}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between border-b border-border p-6">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {closeButton && (
                  <button
                    onClick={onClose}
                    className="rounded p-1 hover:bg-muted transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={title ? "p-6" : "p-6"}>
              {children}
            </div>
          </div>
        </div>
      </>
    )
  }
)
Modal.displayName = "Modal"

export { Modal }
