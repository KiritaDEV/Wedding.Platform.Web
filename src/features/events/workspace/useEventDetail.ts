import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../../lib/api'
import { useAuth } from '../../auth/AuthContext'
import { getEvent } from '../eventsApi'
import type { EventDetail } from '../types'

export type EventLoadError = 'forbidden' | 'notFound' | 'failed'

export function useEventDetail(eventId: string) {
  const { refreshUser } = useAuth()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [error, setError] = useState<EventLoadError | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const retry = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    void getEvent(eventId, controller.signal)
      .then((loadedEvent) => {
        setEvent(loadedEvent)
        setError(null)
      })
      .catch(async (loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return
        if (loadError instanceof ApiError && loadError.isAuthenticationError) {
          await refreshUser()
          return
        }
        if (loadError instanceof ApiError && loadError.isAuthorizationError) setError('forbidden')
        else if (loadError instanceof ApiError && loadError.status === 404) setError('notFound')
        else setError('failed')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [eventId, reloadKey, refreshUser])

  return { event, setEvent, error, isLoading, retry }
}
