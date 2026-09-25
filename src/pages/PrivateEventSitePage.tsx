import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPrivateEventSite, openPrivateInvitation, privateSiteLoadError, requestPrivateInvitationAccess, resolvePrivateInvitationAccess, submitPrivateInvitationRsvp, type PrivateEventSite, type PrivateSiteLoadError } from '../features/privateEventSite/api'
import { isEmbeddedSocialWebView } from '../features/privateEventSite/browserEnvironment'
import { normalizeHistoricalLocation, privateMutationToken } from '../features/privateEventSite/historicalNavigation'
import { beginRequest, invalidateRequest, isCurrentRequest } from '../features/privateEventSite/requestGeneration'
import { WebsiteRenderer } from '../features/websiteRenderer/WebsiteRenderer'
import { ApiError } from '../lib/api'

export function PrivateEventSitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState<PrivateEventSite | null>(null)
  const [error, setError] = useState<PrivateSiteLoadError | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState(false)
  const [accessBusy, setAccessBusy] = useState(false)
  const accessBusyRef = useRef(false)
  const requestGeneration = useRef(0)
  const handoffOnly = typeof navigator !== 'undefined' && isEmbeddedSocialWebView(navigator.userAgent)

  useEffect(() => {
    const controller = new AbortController()
    const generation = beginRequest(requestGeneration)
    getPrivateEventSite(token, controller.signal, handoffOnly)
      .then((value) => {
        if (!isCurrentRequest(requestGeneration, generation)) return
        setSite(value)
        setError(null)
        normalizeHistoricalLocation(value, navigate)
      })
      .catch((reason: unknown) => {
        if (!isCurrentRequest(requestGeneration, generation)) return
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(privateSiteLoadError(reason))
      })
    return () => {
      invalidateRequest(requestGeneration, generation)
      controller.abort()
    }
  }, [handoffOnly, navigate, reloadKey, token])

  const mutationToken = privateMutationToken(site, token)

  const open = useCallback(async () => {
    setOpening(true)
    setOpenError(false)
    try {
      await openPrivateInvitation(mutationToken)
    } catch (reason) {
      if (!(reason instanceof ApiError && reason.status === 409)) setOpenError(true)
    } finally {
      try {
        setSite(await getPrivateEventSite(mutationToken))
        setError(null)
      } catch (reason) {
        setError(privateSiteLoadError(reason))
      }
      setOpening(false)
    }
  }, [mutationToken])

  const submitRsvp = useCallback(async (responses: Array<{ guestId: string; response: 'attending' | 'declined' }>) => {
    try {
      const result = await submitPrivateInvitationRsvp(mutationToken, responses)
      setSite((current) => current === null ? current : {
        ...current,
        privateInvitation: { ...current.privateInvitation, rsvp: result.rsvp },
      })
      return result
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 422) {
        try {
          const current = await getPrivateEventSite(mutationToken)
          setSite(current)
          setError(null)
        } catch {
          // Preserve the mutation error and existing safe household state.
        }
      }
      throw reason
    }
  }, [mutationToken])

  const refresh = useCallback(async () => {
    const current = await getPrivateEventSite(mutationToken, undefined, handoffOnly)
    setSite(current)
    setError(null)
  }, [handoffOnly, mutationToken])

  const requestAccess = useCallback(async () => {
    if (accessBusyRef.current) return
    accessBusyRef.current = true
    setAccessBusy(true)
    try { await requestPrivateInvitationAccess(mutationToken); await refresh() }
    finally { accessBusyRef.current = false; setAccessBusy(false) }
  }, [mutationToken, refresh])

  const resolveAccess = useCallback(async (decision: 'approve' | 'reject') => {
    if (accessBusyRef.current) return
    accessBusyRef.current = true
    setAccessBusy(true)
    try {
      await resolvePrivateInvitationAccess(mutationToken, decision)
      setSite(null)
      await refresh()
    } finally { accessBusyRef.current = false; setAccessBusy(false) }
  }, [mutationToken, refresh])

  return <PrivateEventSiteView
    site={site}
    error={error}
    opening={opening}
    openError={openError}
    onOpen={() => { void open() }}
    onSubmitRsvp={submitRsvp}
    accessBusy={accessBusy}
    onRequestAccess={requestAccess}
    onResolveAccess={resolveAccess}
    onRetry={() => {
      invalidateRequest(requestGeneration)
      setSite(null)
      setError(null)
      setReloadKey((value) => value + 1)
    }}
  />
}

export function PrivateEventSiteView({ site, error, opening, openError, onOpen, onSubmitRsvp, accessBusy = false, onRequestAccess = async () => undefined, onResolveAccess = async () => undefined, onRetry }: {
  site: PrivateEventSite | null
  error: PrivateSiteLoadError | null
  opening: boolean
  openError: boolean
  onOpen: () => void
  onSubmitRsvp: (responses: Array<{ guestId: string; response: 'attending' | 'declined' }>) => ReturnType<typeof submitPrivateInvitationRsvp>
  accessBusy?: boolean
  onRequestAccess?: () => Promise<void>
  onResolveAccess?: (decision: 'approve' | 'reject') => Promise<void>
  onRetry: () => void
}) {
  if (error === 'unavailable') return <PrivateState title="This invitation link is unavailable." />
  if (error === 'load') return <PrivateState title="Unable to load this invitation." action="Try again" onAction={onRetry} />
  if (!site) return <main className="grid min-h-svh place-items-center bg-background text-foreground-muted" role="status">Loading invitation…</main>
  if (site.status === 'unpublished' || !site.website) return <PrivateState title="This event site isn’t published yet." />

  return <main className="min-h-svh overflow-x-hidden"><WebsiteRenderer
    event={{ id: site.event.id ?? '', name: site.event.name, eventDate: site.event.eventDate ?? null, type: 'wedding' }}
    website={site.website}
    mode="public"
    audience="private-site"
    privateInvitationRuntime={{ ...site.privateInvitation, opening, openError, onOpen, onSubmitRsvp, accessBusy, onRequestAccess, onResolveAccess }}
  /></main>
}

function PrivateState({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <main className="grid min-h-svh place-items-center bg-background p-6"><section className="max-w-lg text-center"><h1 className="text-2xl font-semibold text-foreground">{title}</h1>{action && <button type="button" className="mt-5 rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground" onClick={onAction}>{action}</button>}</section></main>
}
