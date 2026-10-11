import { ApiError } from '../../lib/api'

export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Unable to connect to the server. Check your connection and try again.'
    }

    if (error.status >= 500) {
      return 'The server could not complete the request. Please try again.'
    }

    return error.message
  }

  return 'Something went wrong. Please try again.'
}
