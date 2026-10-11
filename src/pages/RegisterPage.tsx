import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Heading } from '../components/ui/Heading'
import { Input } from '../components/ui/Input'
import { Text } from '../components/ui/Text'
import { useAuth } from '../features/auth/AuthContext'
import { authErrorMessage } from '../features/auth/errorMessage'
import { registerSchema, type RegisterFormValues } from '../features/auth/schemas'
import { ApiError } from '../lib/api'

export function RegisterPage() {
  const { register: createAccount } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)

    try {
      await createAccount(values)
      navigate('/events', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        for (const field of ['name', 'email', 'password', 'passwordConfirmation'] as const) {
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
          <Heading level={1} variant="title">Create an account</Heading>
          <Text className="mt-1" variant="muted">Start managing your events.</Text>
        </div>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {formError && <Text className="rounded-xl bg-danger-muted p-3" variant="error" role="alert">{formError}</Text>}

          <div>
            <label className="block text-sm font-medium" htmlFor="name">Name</label>
            <Input className="mt-1" id="name" type="text" autoComplete="name" {...register('name')} />
            {errors.name && <Text className="mt-1" variant="error">{errors.name.message}</Text>}
          </div>

          <div>
            <label className="block text-sm font-medium" htmlFor="email">Email</label>
            <Input className="mt-1" id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <Text className="mt-1" variant="error">{errors.email.message}</Text>}
          </div>

          <div>
            <label className="block text-sm font-medium" htmlFor="password">Password</label>
            <Input className="mt-1" id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <Text className="mt-1" variant="error">{errors.password.message}</Text>}
          </div>

          <div>
            <label className="block text-sm font-medium" htmlFor="passwordConfirmation">Confirm password</label>
            <Input className="mt-1" id="passwordConfirmation" type="password" autoComplete="new-password" {...register('passwordConfirmation')} />
            {errors.passwordConfirmation && <Text className="mt-1" variant="error">{errors.passwordConfirmation.message}</Text>}
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <Text variant="muted">Already have an account? <Link className="font-medium text-accent underline" to="/login">Sign in</Link></Text>
      </section>
    </main>
  )
}
