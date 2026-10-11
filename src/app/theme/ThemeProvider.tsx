import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ResolvedTheme, type ThemePreference } from './ThemeContext'

const STORAGE_KEY = 'event-platform-theme'

function savedPreference(): ThemePreference {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'light' || value === 'dark' ? value : 'system'
}

function resolvedTheme(preference: ThemePreference): ResolvedTheme {
  const isDark = preference === 'dark'
    || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  return isDark ? 'dark' : 'light'
}

function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolvedTheme(preference)
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  return resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(savedPreference)
  const [activeTheme, setActiveTheme] = useState<ResolvedTheme>(() => resolvedTheme(savedPreference()))

  useEffect(() => {
    applyTheme(preference)
    const media = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (preference === 'system') setActiveTheme(applyTheme('system')) }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  const value = useMemo(() => ({
    preference,
    resolvedTheme: activeTheme,
    setPreference(next: ThemePreference) {
      setPreferenceState(next)
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
      setActiveTheme(applyTheme(next))
    },
  }), [preference, activeTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}
