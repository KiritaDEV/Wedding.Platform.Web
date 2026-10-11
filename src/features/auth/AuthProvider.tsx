import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../../lib/api'
import { getCurrentUser, loginUser, logoutUser, registerUser } from './authApi'
import { AuthContext, type AuthContextValue } from './AuthContext'
import type { AuthUser, LoginRequest, RegisterRequest } from './types'

let initialSessionRequest: Promise<AuthUser | null> | undefined

function restoreInitialSession(): Promise<AuthUser | null> {
  initialSessionRequest ??= getCurrentUser().catch((error: unknown) => {
    if (error instanceof ApiError && error.isAuthenticationError) {
      return null
    }

    throw error
  })

  return initialSessionRequest
}

function restorationMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 0) {
    return 'Unable to connect to the server. Check your connection and try again.'
  }

  return 'We could not check your current session. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [restorationError, setRestorationError] = useState<string | null>(null)

  const refreshUser = useCallback(async () => {
    setIsLoading(true)
    setRestorationError(null)

    try {
      setUser(await getCurrentUser())
    } catch (error) {
      if (error instanceof ApiError && error.isAuthenticationError) {
        setUser(null)
      } else {
        setRestorationError(restorationMessage(error))
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    void restoreInitialSession()
      .then((restoredUser) => {
        if (active) setUser(restoredUser)
      })
      .catch((error: unknown) => {
        if (active) setRestorationError(restorationMessage(error))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (input: LoginRequest) => {
    const authenticatedUser = await loginUser(input)
    setUser(authenticatedUser)
    setRestorationError(null)
    return authenticatedUser
  }, [])

  const register = useCallback(async (input: RegisterRequest) => {
    const authenticatedUser = await registerUser(input)
    setUser(authenticatedUser)
    setRestorationError(null)
    return authenticatedUser
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    setUser(null)
    setRestorationError(null)
    initialSessionRequest = Promise.resolve(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      restorationError,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, restorationError, login, register, logout, refreshUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
