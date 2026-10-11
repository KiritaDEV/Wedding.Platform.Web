import { apiRequest, ensureCsrfCookie } from '../../lib/api'
import type { ApiResource } from '../../lib/api'
import type { AuthUser, LoginRequest, RegisterRequest } from './types'

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest<ApiResource<AuthUser>>('/api/auth/me')
  return response.data
}

export async function loginUser(input: LoginRequest): Promise<AuthUser> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<AuthUser>>('/api/auth/login', {
    method: 'POST',
    body: input,
  })
  return response.data
}

export async function registerUser(input: RegisterRequest): Promise<AuthUser> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<AuthUser>>('/api/auth/register', {
    method: 'POST',
    body: input,
  })
  return response.data
}

export async function logoutUser(): Promise<void> {
  await ensureCsrfCookie()
  await apiRequest('/api/auth/logout', { method: 'POST' })
}
