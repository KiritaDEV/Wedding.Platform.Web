import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import publishedFixture from '../publicEventSite/fixtures/published-public-site.json'
import { PrivateInvitationRuntimeProvider } from '../websiteRenderer/PrivateInvitationRuntimeContext'
import type { PrivateInvitationRendererRuntime } from '../websiteRenderer/privateInvitationRuntime'
import { PrivateRsvpRuntime } from '../websiteRenderer/PrivateRsvpRuntime'
import { getPrivateEventSite, openPrivateInvitation, privateSiteLoadError } from './api'
import { beginRequest, invalidateRequest, isCurrentRequest } from './requestGeneration'

vi.mock('../websiteRenderer/WebsiteRenderer', () => ({
  WebsiteRenderer: ({ privateInvitationRuntime }: { privateInvitationRuntime: PrivateInvitationRendererRuntime }) => <div data-private-site-state={privateInvitationRuntime.trustState}>{privateInvitationRuntime.rsvp?.guests.map(({ name }) => name).join(', ')}</div>,
}))

import { PrivateEventSiteView } from '../../pages/PrivateEventSitePage'

function runtime(overrides: Partial<PrivateInvitationRendererRuntime> = {}): PrivateInvitationRendererRuntime {
  return {
    linkStatus: 'current',
    invitationStatus: 'active',
    trustState: 'unclaimed',
    canOpen: true,
    rsvp: null,
    opening: false,
    openError: false,
    onOpen: () => undefined,
    onSubmitRsvp: async () => { throw new Error('Unexpected RSVP submission') },
    accessBusy: false,
    onRequestAccess: async () => undefined,
    onResolveAccess: async () => undefined,
    ...overrides,
  }
}

function renderRsvp(value: PrivateInvitationRendererRuntime): string {
  return renderToStaticMarkup(
    <PrivateInvitationRuntimeProvider value={value}>
      <PrivateRsvpRuntime buttonClassName="rsvp-button">Authored RSVP action</PrivateRsvpRuntime>
    </PrivateInvitationRuntimeProvider>,
  )
}

describe('private Event Site API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('normalizes the private envelope while preserving the separate trust runtime', async () => {
    const response = {
      data: {
        ...publishedFixture.data,
        privateInvitation: {
          linkStatus: 'current', invitationStatus: 'active', trustState: 'unclaimed', canOpen: true, rsvp: null,
        },
      },
    }
    const browser = { cookie: '' }
    const requests: string[] = []
    vi.stubGlobal('document', browser)
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      requests.push(url)
      if (url.endsWith('/sanctum/csrf-cookie')) {
        browser.cookie = 'XSRF-TOKEN=cold-load-proof'
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))

    const site = await getPrivateEventSite('opaque-private-token')

    expect(site.website?.media).toEqual({})
    expect(site.privateInvitation).toEqual(response.data.privateInvitation)
    expect(requests[0]).toContain('/sanctum/csrf-cookie')
    expect(requests[1]).toContain('/api/private-invitations/site')
  })

  it.each(['unclaimed', 'claimed_elsewhere', 'trusted'] as const)('renders %s on the first cold load after deterministic CSRF bootstrap', async (trustState) => {
    const browser = { cookie: '' }
    const privateInvitation = {
      linkStatus: 'current' as const,
      invitationStatus: 'active' as const,
      trustState,
      canOpen: trustState === 'unclaimed',
      rsvp: trustState === 'trusted' ? {
        status: 'complete' as const, attendingCount: 1, declinedCount: 0, pendingCount: 0,
        lastUpdated: null, availability: 'open' as const,
        guests: [{ id: 'guest-one', name: 'Trusted Guest', response: 'attending' as const }],
      } : null,
    }
    const response = { data: { ...publishedFixture.data, privateInvitation } }
    const order: string[] = []
    vi.stubGlobal('document', browser)
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      order.push(url)
      if (url.endsWith('/sanctum/csrf-cookie')) {
        browser.cookie = 'XSRF-TOKEN=cold-load-proof'
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))

    const site = await getPrivateEventSite('opaque-private-token')
    const markup = renderToStaticMarkup(<PrivateEventSiteView site={site} error={null} opening={false} openError={false} onOpen={() => undefined} onSubmitRsvp={async () => { throw new Error('Unexpected RSVP submission') }} onRetry={() => undefined} />)

    expect(order.map((url) => new URL(url).pathname)).toEqual(['/sanctum/csrf-cookie', '/api/private-invitations/site'])
    expect(markup).toContain(`data-private-site-state="${trustState}"`)
    if (trustState === 'trusted') expect(markup).toContain('Trusted Guest')
  })

  it.each([
    [404, 'unavailable', 'This invitation link is unavailable.'],
    [419, 'load', 'Unable to load this invitation.'],
    [500, 'load', 'Unable to load this invitation.'],
  ] as const)('maps HTTP %i to the safe %s state', async (status, expectedError, expectedMessage) => {
    vi.stubGlobal('document', { cookie: '' })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/sanctum/csrf-cookie')
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify({ message: 'Safe failure' }), { status, headers: { 'Content-Type': 'application/json' } })))

    const reason = await getPrivateEventSite('opaque-private-token').catch((error: unknown) => error)
    const error = privateSiteLoadError(reason)
    const markup = renderToStaticMarkup(<PrivateEventSiteView site={null} error={error} opening={false} openError={false} onOpen={() => undefined} onSubmitRsvp={async () => { throw new Error('Unexpected RSVP submission') }} onRetry={() => undefined} />)

    expect(error).toBe(expectedError)
    expect(markup).toContain(expectedMessage)
    if (status !== 404) expect(markup).not.toContain('link is unavailable')
  })

  it('maps CSRF bootstrap and network failures to the retryable load state', async () => {
    vi.stubGlobal('document', { cookie: '' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 419 })))

    const bootstrapReason = await getPrivateEventSite('opaque-private-token').catch((error: unknown) => error)
    expect(privateSiteLoadError(bootstrapReason)).toBe('load')

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    const networkReason = await getPrivateEventSite('opaque-private-token').catch((error: unknown) => error)
    const error = privateSiteLoadError(networkReason)
    const markup = renderToStaticMarkup(<PrivateEventSiteView site={null} error={error} opening={false} openError={false} onOpen={() => undefined} onSubmitRsvp={async () => { throw new Error('Unexpected RSVP submission') }} onRetry={() => undefined} />)

    expect(error).toBe('load')
    expect(markup).toContain('Try again')
    expect(markup).not.toContain('link is unavailable')
  })

  it('preserves an aborted CSRF bootstrap as cancellation instead of a visible load error', async () => {
    const controller = new AbortController()
    vi.stubGlobal('document', { cookie: '' })
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })))

    const request = getPrivateEventSite('opaque-private-token', controller.signal)
    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('allows only the latest request generation to publish terminal state', () => {
    const generation = { current: 0 }
    const strictModeFirst = beginRequest(generation)
    invalidateRequest(generation, strictModeFirst)
    const current = beginRequest(generation)

    expect(isCurrentRequest(generation, strictModeFirst)).toBe(false)
    expect(isCurrentRequest(generation, current)).toBe(true)

    const visibleStates = ['loading']
    if (isCurrentRequest(generation, strictModeFirst)) visibleStates.push('load-error')
    if (isCurrentRequest(generation, current)) visibleStates.push('claimed-elsewhere')
    expect(visibleStates).toEqual(['loading', 'claimed-elsewhere'])
  })

  it('starts Try again as a clean loading generation before publishing its result', () => {
    const generation = { current: 1 }
    const visibleStates = ['load-error']

    invalidateRequest(generation)
    visibleStates.push('loading')
    const retry = beginRequest(generation)
    if (isCurrentRequest(generation, retry)) visibleStates.push('unclaimed')

    expect(visibleStates).toEqual(['load-error', 'loading', 'unclaimed'])
  })

  it('bootstraps CSRF before deliberately opening the invitation', async () => {
    const fetchMock = vi.fn(async (...args: [RequestInfo | URL, RequestInit?]) => {
      void args
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=csrf-proof' })
    vi.stubGlobal('fetch', fetchMock)

    await openPrivateInvitation('opaque-private-token')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/sanctum/csrf-cookie')
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/api/private-invitations/open')
    const request = fetchMock.mock.calls[1]?.[1] as RequestInit
    expect(request.credentials).toBe('include')
    expect(new Headers(request.headers).get('X-XSRF-TOKEN')).toBe('csrf-proof')
    expect(JSON.parse(String(request.body))).toEqual({ token: 'opaque-private-token' })
  })
})

describe('private RSVP trust states', () => {
  it('offers the deliberate Open Invitation action only to an eligible unclaimed browser', () => {
    expect(renderRsvp(runtime())).toContain('Open Invitation')
    expect(renderRsvp(runtime({ invitationStatus: 'inactive', canOpen: false }))).not.toContain('<button')
    expect(renderRsvp(runtime({ trustState: 'claimed_elsewhere', canOpen: false }))).toContain('linked to another browser')
  })

  it('renders only the trusted active-guest read model and no mutation controls', () => {
    const markup = renderRsvp(runtime({
      trustState: 'trusted',
      canOpen: false,
      rsvp: {
        status: 'partial', attendingCount: 1, declinedCount: 0, pendingCount: 1,
        lastUpdated: '2026-09-24T10:00:00Z', availability: 'deadline_passed',
        guests: [
          { id: 'guest-one', name: 'Guest One', response: 'attending' },
          { id: 'guest-two', name: 'Guest Two', response: null },
        ],
      },
    }))

    expect(markup).toContain('data-private-rsvp-state="trusted"')
    expect(markup).toContain('Guest One')
    expect(markup).toContain('Guest Two')
    expect(markup).toContain('1 attending')
    expect(markup).toContain('deadline has passed')
    expect(markup).not.toContain('<button')
    expect(markup).not.toContain('Open Invitation')
  })
})
