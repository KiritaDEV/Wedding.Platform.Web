import { useCallback, useEffect, useState } from 'react'
import { getWebsiteCreationTemplates } from './api'
import type { WebsiteTemplateOption } from './types'

export function useWebsiteCreationTemplates(eventId: string) {
  const key = `website-creation-templates:${eventId}`
  const [result, setResult] = useState<{ key: string; templates: WebsiteTemplateOption[]; error: unknown } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getWebsiteCreationTemplates(eventId, controller.signal)
      .then((items) => setResult({ key, templates: items, error: null }))
      .catch((loadError: unknown) => {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) {
          setResult({ key, templates: [], error: loadError })
        }
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [eventId, key, reload])

  const retry = useCallback(() => { setIsLoading(true); setReload((value) => value + 1) }, [])
  const current = result?.key === key
  return {
    templates: current ? result.templates : [],
    error: current ? result.error : null,
    isLoading: isLoading || !current,
    retry,
  }
}
