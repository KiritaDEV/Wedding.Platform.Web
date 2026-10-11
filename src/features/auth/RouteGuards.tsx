import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { AuthLoading, AuthRestorationError } from './AuthStatus'

function PendingAuth() {
  const { isLoading, restorationError } = useAuth()

  if (isLoading) return <AuthLoading />
  if (restorationError) return <AuthRestorationError />
  return null
}

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.isLoading || auth.restorationError) return <PendingAuth />
  if (!auth.isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />

  return <Outlet />
}

export function GuestRoute() {
  const auth = useAuth()

  if (auth.isLoading || auth.restorationError) return <PendingAuth />
  if (auth.isAuthenticated) return <Navigate to="/events" replace />

  return <Outlet />
}

export function RootRedirect() {
  const auth = useAuth()

  if (auth.isLoading || auth.restorationError) return <PendingAuth />

  return <Navigate to={auth.isAuthenticated ? '/events' : '/login'} replace />
}
