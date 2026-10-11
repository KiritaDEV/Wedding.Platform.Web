import { useAuth } from './AuthContext'

export function AuthLoading() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <p role="status">Checking your session…</p>
    </main>
  )
}

export function AuthRestorationError() {
  const { restorationError, refreshUser } = useAuth()

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="space-y-4 text-center">
        <p role="alert">{restorationError}</p>
        <button
          className="rounded bg-slate-900 px-4 py-2 text-white"
          type="button"
          onClick={() => void refreshUser()}
        >
          Try again
        </button>
      </div>
    </main>
  )
}
