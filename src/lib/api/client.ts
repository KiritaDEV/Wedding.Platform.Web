import { config } from '../config'
import { ApiError } from './ApiError'
import { getXsrfToken } from './csrf'
import type { ValidationErrors } from './types'

type ApiRequestOptions = Omit<RequestInit, 'body' | 'credentials' | 'headers'> & {
  body?: unknown
  headers?: HeadersInit
}

type ErrorPayload = {
  message?: unknown
  errors?: unknown
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function endpointUrl(path: string): string {
  return new URL(path.replace(/^\//, ''), `${config.apiBaseUrl}/`).toString()
}

async function parseJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }

  const text = await response.text()

  if (!text) {
    return undefined
  }

  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function validationErrors(value: unknown): ValidationErrors {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) && entry[1].every((message) => typeof message === 'string'),
    ),
  )
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      body = options.body
    } else {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(options.body)
    }
  }

  if (!SAFE_METHODS.has(method)) {
    const token = getXsrfToken()
    if (token) {
      headers.set('X-XSRF-TOKEN', token)
    }
  }

  let response: Response
  try {
    response = await fetch(endpointUrl(path), {
      ...options,
      method,
      body,
      headers,
      credentials: 'include',
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }

    throw new ApiError(0, 'Unable to connect to the API.', {}, { cause })
  }

  const payload = await parseJson(response)

  if (!response.ok) {
    const error = (payload ?? {}) as ErrorPayload
    throw new ApiError(
      response.status,
      typeof error.message === 'string' ? error.message : `Request failed with status ${response.status}.`,
      validationErrors(error.errors),
      undefined,
      payload,
    )
  }

  return payload as T
}
