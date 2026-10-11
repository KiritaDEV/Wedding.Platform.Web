import { useCallback, useEffect, useState } from 'react'
import { getWebsiteDraft } from './api'
import type { WebsiteDraft } from './types'
import { ApiError } from '../../lib/api'
import { websiteDraftKey } from '../websiteProjects/api'

export function useWebsiteDraft(eventId: string, projectId: string) {
  const key = websiteDraftKey(eventId, projectId).join(':')
  const [result, setResult] = useState<{ key: string; draft: WebsiteDraft | null; error: unknown; uninitialized: boolean } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getWebsiteDraft(eventId, projectId, controller.signal)
      .then((draft) => setResult({ key, draft, error: null, uninitialized: false }))
      .catch((loadError: unknown) => {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) {
          setResult({
            key,
            draft: null,
            error: loadError instanceof ApiError && loadError.status === 404 ? null : loadError,
            uninitialized: loadError instanceof ApiError && loadError.status === 404,
          })
        }
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [eventId, key, projectId, reloadKey])

  const retry = useCallback(() => {
    setIsLoading(true)
    setReloadKey((value) => value + 1)
  }, [])
  const isCurrent = result?.key === key
  const setDraft = useCallback((draft: WebsiteDraft) => setResult({ key, draft, error: null, uninitialized: false }), [key])
  return {
    draft: isCurrent ? result.draft : null,
    setDraft,
    error: isCurrent ? result.error : null,
    isLoading: isLoading || !isCurrent,
    isUninitialized: Boolean(isCurrent && result?.uninitialized),
    retry,
  }
}
