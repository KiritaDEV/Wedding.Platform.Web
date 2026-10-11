import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Heading } from '../components/ui/Heading'
import { Input } from '../components/ui/Input'
import { Text } from '../components/ui/Text'
import { ApiError } from '../lib/api'
import { useAuth } from '../features/auth/AuthContext'
import { authErrorMessage } from '../features/auth/errorMessage'
import { loginSchema, type LoginFormValues } from '../features/auth/schemas'

function intendedPath(state: unknown): string {
  if (!state || typeof state !== 'object' || !('from' in state)) return '/events'
  const from = state.from
  if (!from || typeof from !== 'object' || !('pathname' in from)) return '/events'

  const pathname = typeof from.pathname === 'string' ? from.pathname : '/events'
  const search = 'search' in from && typeof from.search === 'string' ? from.search : ''
  return pathname.startsWith('/') && !pathname.startsWith('//') ? `${pathname}${search}` : '/events'
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)

    try {
      await login(values)
      navigate(intendedPath(location.state), { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        for (const field of ['email', 'password'] as const) {
          const message = error.validationErrors[field]?.[0]
          if (message) setError(field, { message })
        }
      }
      setFormError(authErrorMessage(error))
    }
  })

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <section className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-surface p-6">
        <div>
          <Heading level={1} variant="title">Login</Heading>
          <Text className="mt-1" variant="muted">Sign in to manage your events.</Text>
        </div>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {formError && <Text className="rounded-xl bg-danger-muted p-3" variant="error" role="alert">{formError}</Text>}

          <div>
            <label className="block text-sm font-medium" htmlFor="email">Email</label>
            <Input className="mt-1" id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <Text className="mt-1" variant="error">{errors.email.message}</Text>}
          </div>

          <div>
            <label className="block text-sm font-medium" htmlFor="password">Password</label>
            <Input className="mt-1" id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <Text className="mt-1" variant="error">{errors.password.message}</Text>}
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <Text variant="muted">New here? <Link className="font-medium text-accent underline" to="/register">Create an account</Link></Text>
      </section>
    </main>
  )
}
