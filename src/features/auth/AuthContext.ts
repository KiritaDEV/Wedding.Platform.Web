import { createContext, use } from 'react'
import type { AuthUser, LoginRequest, RegisterRequest } from './types'

export type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  restorationError: string | null
  login: (input: LoginRequest) => Promise<AuthUser>
  register: (input: RegisterRequest) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
