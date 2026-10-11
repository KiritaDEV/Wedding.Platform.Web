import { useCallback, useRef, useState, type SetStateAction } from 'react'

/** The ref records input synchronously, including edits before a save promise settles. */
export function useTrackedOverride<T>(initial: T) {
  const [value, setState] = useState(initial)
  const current = useRef(initial)
  const setValue = useCallback((next: SetStateAction<T>) => {
    const resolved = typeof next === 'function' ? (next as (previous: T) => T)(current.current) : next
    current.current = resolved
    setState(resolved)
  }, [])
  return [value, setValue, current] as const
}
