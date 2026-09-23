import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicEventSite, type PublicEventSite } from '../features/publicEventSite/api'
import { WebsiteRenderer } from '../features/websiteRenderer/WebsiteRenderer'
import { ApiError } from '../lib/api'

export function PublicEventSitePage() {
  const { slug = '' } = useParams()
  const [site, setSite] = useState<PublicEventSite | null>(null)
  const [error, setError] = useState<'not-found' | 'load' | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getPublicEventSite(slug, controller.signal)
      .then((value) => { setSite(value); setError(null) })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        if (import.meta.env.DEV) console.error('Public Event Site failed to load.', reason)
        setError(reason instanceof ApiError && reason.status === 404 ? 'not-found' : 'load')
      })
    return () => controller.abort()
  }, [slug])

  return <PublicEventSiteView site={site} error={error} />
}

export function PublicEventSiteView({ site, error }: { site: PublicEventSite | null; error: 'not-found' | 'load' | null }) {
  if (error) return <PublicState title={error === 'not-found' ? 'Event site not found' : 'Unable to load this event site'} />
  if (!site) return <main className="grid min-h-svh place-items-center bg-background text-foreground-muted" role="status">Loading event site…</main>
  return <PublicEventSiteContent site={site} />
}

export function PublicEventSiteContent({ site }: { site: PublicEventSite }) {
  if (site.status === 'unpublished' || !site.website) return <PublicState title="This event site isn’t published yet." />

  return <main className="min-h-svh overflow-x-hidden"><WebsiteRenderer event={{ id: site.event.id ?? '', name: site.event.name, eventDate: site.event.eventDate ?? null, type: 'wedding' }} website={site.website} mode="public" audience="public-site" /></main>
}

function PublicState({ title }: { title: string }) {
  return <main className="grid min-h-svh place-items-center bg-background p-6"><section className="max-w-lg text-center"><h1 className="text-2xl font-semibold text-foreground">{title}</h1></section></main>
}
