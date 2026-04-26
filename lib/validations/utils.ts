import { ZodError } from 'zod'

export type ValidationError = {
  field: string
  message: string
}

export function parseValidationError(error: any): ValidationError[] {
  if (!error.issues) return []
  return error.issues.map((issue: any) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }))
}

export function getFirstError(errors: ValidationError[]): string {
  return errors[0]?.message || 'Validation error'
}

export function getFieldError(errors: ValidationError[], field: string): string | null {
  const error = errors.find(e => e.field === field)
  return error?.message || null
}
