export type PlatformRole = 'user' | 'superAdmin'

export type AuthUser = {
  id: string
  name: string
  email: string
  platformRole: PlatformRole
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  name: string
  email: string
  password: string
  passwordConfirmation: string
}
