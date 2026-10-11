import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../lib/api'
import { useAuth } from '../auth/AuthContext'
import { getMyEvents } from './eventsApi'
import type { Event } from './types'

function eventLoadMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 0) return 'Unable to connect to the server.'
  if (error instanceof ApiError && error.status >= 500) return 'The server could not load your events.'
  return 'Your events could not be loaded.'
}

export function useMyEvents() {
  const { refreshUser } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }, [])
  const prependEvent = useCallback((event: Event) => setEvents((current) => [event, ...current]), [])

  useEffect(() => {
    const controller = new AbortController()
    void getMyEvents(controller.signal)
      .then(setEvents)
      .catch(async (loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return
        if (loadError instanceof ApiError && loadError.isAuthenticationError) {
          await refreshUser()
          return
        }
        setError(eventLoadMessage(loadError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [reloadKey, refreshUser])

  return { events, isLoading, error, reload, prependEvent }
}
