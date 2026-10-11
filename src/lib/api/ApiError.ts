import type { ValidationErrors } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly validationErrors: ValidationErrors
  readonly payload: unknown

  constructor(
    status: number,
    message: string,
    validationErrors: ValidationErrors = {},
    options?: ErrorOptions,
    payload?: unknown,
  ) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
    this.validationErrors = validationErrors
    this.payload = payload
  }

  get isValidationError(): boolean {
    return this.status === 422
  }

  get isAuthenticationError(): boolean {
    return this.status === 401
  }

  get isAuthorizationError(): boolean {
    return this.status === 403
  }
}
