import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../app/theme/ThemeContext'

export function ThemeSwitch() {
  const { resolvedTheme, setPreference } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      className="relative flex h-9 w-16 items-center justify-between rounded-full border border-border bg-surface-muted px-2 text-foreground-muted"
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
    >
      <Sun aria-hidden="true" className={`relative z-10 ${isDark ? '' : 'text-accent'}`} size={14} />
      <Moon aria-hidden="true" className={`relative z-10 ${isDark ? 'text-accent' : ''}`} size={14} />
      <span className={`absolute left-1 top-1 size-7 rounded-full border border-border bg-surface shadow-sm transition-transform duration-200 ${isDark ? 'translate-x-7' : ''}`} aria-hidden="true" />
    </button>
  )
}
