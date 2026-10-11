import { useCallback, useEffect, useState } from 'react'
import { listWebsiteProjects, websiteProjectListKey } from './api'
import type { WebsiteProjectSummary } from './types'

export function useWebsiteProjects(eventId: string) {
  const key = websiteProjectListKey(eventId).join(':')
  const [result, setResult] = useState<{ key: string; projects: WebsiteProjectSummary[]; error: unknown } | null>(null)
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listWebsiteProjects(eventId, controller.signal)
      .then((projects) => setResult({ key, projects, error: null }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setResult({ key, projects: [], error })
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [eventId, key, reload])

  const retry = useCallback(() => { setLoading(true); setReload((value) => value + 1) }, [])
  const current = result?.key === key
  return { projects: current ? result.projects : [], error: current ? result.error : null, isLoading: loading || !current, retry }
}
