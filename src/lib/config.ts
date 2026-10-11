function requiredUrl(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required. Add it to your local .env file.`)
  }

  try {
    return new URL(value).origin
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`)
  }
}

export const config = {
  apiBaseUrl: requiredUrl('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL),
} as const
