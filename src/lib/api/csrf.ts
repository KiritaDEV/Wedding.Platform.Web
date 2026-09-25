import { config } from '../config'
import { ApiError } from './ApiError'

const XSRF_COOKIE_NAME = 'XSRF-TOKEN'

export function getXsrfToken(): string | null {
  const prefix = `${XSRF_COOKIE_NAME}=`
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
}

export async function ensureCsrfCookie(signal?: AbortSignal): Promise<void> {
  let response: Response

  try {
    response = await fetch(`${config.apiBaseUrl}/sanctum/csrf-cookie`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }

    throw new ApiError(0, 'Unable to connect to the API.', {}, { cause })
  }

  if (!response.ok) {
    throw new ApiError(response.status, 'Unable to initialize CSRF protection.')
  }
}
