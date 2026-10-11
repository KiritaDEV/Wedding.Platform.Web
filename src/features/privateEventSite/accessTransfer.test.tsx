import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PrivateInvitationRuntimeProvider } from '../websiteRenderer/PrivateInvitationRuntimeContext'
import { PrivateRsvpRuntime } from '../websiteRenderer/PrivateRsvpRuntime'
import type { PrivateInvitationRendererRuntime } from '../websiteRenderer/privateInvitationRuntime'
import { canonicalPrivateUrl, copyText } from './clipboard'
import { requestPrivateInvitationAccess, resolvePrivateInvitationAccess } from './api'

function runtime(overrides: Partial<PrivateInvitationRendererRuntime>): PrivateInvitationRendererRuntime {
  return {
    linkStatus: 'current', invitationStatus: 'active', trustState: 'claimed_elsewhere', canOpen: false,
    currentPath: '/i/current-token', rsvp: null, opening: false, openError: false, onOpen: () => undefined,
    onSubmitRsvp: async () => { throw new Error('Unexpected RSVP') }, accessBusy: false,
    onRequestAccess: async () => undefined, onResolveAccess: async () => undefined,
    ...overrides,
  }
}

function render(value: PrivateInvitationRendererRuntime): string {
  return renderToStaticMarkup(<PrivateInvitationRuntimeProvider value={value}><PrivateRsvpRuntime buttonClassName="button">Respond</PrivateRsvpRuntime></PrivateInvitationRuntimeProvider>)
}

describe('private access transfer UI', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows Request access only for an eligible normal claimed-elsewhere runtime', () => {
    const eligible = render(runtime({ accessState: 'can_request' }))
    expect(eligible).toContain('Request access')
    expect(eligible).not.toContain('Guest One')

    expect(render(runtime({ accessState: 'request_pending' }))).toContain('access request is already pending')
    expect(render(runtime({ invitationStatus: 'inactive', accessState: null }))).not.toContain('Request access')
  })

  it('shows requester pending state without household data', () => {
    const markup = render(runtime({
      accessState: 'transfer_pending',
      accessRequest: { requestedAt: '2026-09-24T10:00:00Z', expiresAt: '2026-09-25T10:00:00Z' },
    }))
    expect(markup).toContain('Access request pending')
    expect(markup).not.toContain('Guest One')
    expect(markup).not.toContain('Approve')
  })

  it('shows minimal approval metadata only to trusted runtime', () => {
    const markup = render(runtime({
      trustState: 'trusted',
      accessRequest: { browserFamily: 'Chrome', platform: 'Windows', requestedAt: '2026-09-24T10:00:00Z', expiresAt: '2026-09-25T10:00:00Z' },
      rsvp: {
        status: 'complete', attendingCount: 1, declinedCount: 0, pendingCount: 0, lastUpdated: null, availability: 'open',
        guests: [{ id: 'guest-one', name: 'Guest One', response: 'attending' }],
      },
    }))
    expect(markup).toContain('data-access-request')
    expect(markup).toContain('Chrome on Windows')
    expect(markup).toContain('Approve')
    expect(markup).toContain('Reject')
    expect(markup).not.toContain('credential')
  })

  it('always renders handoff-only UX without claim, transfer, or household controls', () => {
    const markup = render(runtime({
      handoffOnly: true, trustState: 'trusted', accessState: 'can_request',
      rsvp: {
        status: 'complete', attendingCount: 1, declinedCount: 0, pendingCount: 0, lastUpdated: null, availability: 'open',
        guests: [{ id: 'guest-one', name: 'Guest One', response: 'attending' }],
      },
    }))
    expect(markup).toContain('Open this invitation in your browser')
    expect(markup).toContain('Copy link')
    expect(markup).not.toContain('Guest One')
    expect(markup).not.toContain('Open Invitation')
    expect(markup).not.toContain('Request access')
    expect(markup).not.toContain('Approve')
  })

  it('uses the canonical current path and reports Clipboard API success or failure', async () => {
    expect(canonicalPrivateUrl('https://wedding.example', '/i/current-token')).toBe('https://wedding.example/i/current-token')
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(copyText('https://wedding.example/i/current-token')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://wedding.example/i/current-token')

    vi.stubGlobal('navigator', { clipboard: { writeText: async () => { throw new Error('denied') } } })
    await expect(copyText('https://wedding.example/i/current-token')).resolves.toBe(false)
  })

  it('CSRF-bootstraps each transfer mutation and sends no request IDs or secrets', async () => {
    const browser = { cookie: 'XSRF-TOKEN=proof' }
    const calls: Array<[RequestInfo | URL, RequestInit?]> = []
    vi.stubGlobal('document', browser)
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init])
      return String(input).endsWith('/sanctum/csrf-cookie')
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify({ data: { accessState: 'pending' } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))

    await requestPrivateInvitationAccess('private-token')
    await resolvePrivateInvitationAccess('private-token', 'approve')
    expect(calls.map(([input]) => new URL(String(input)).pathname)).toEqual([
      '/sanctum/csrf-cookie', '/api/private-invitations/access-requests',
      '/sanctum/csrf-cookie', '/api/private-invitations/access-requests/approve',
    ])
    for (const index of [1, 3]) expect(JSON.parse(String(calls[index]?.[1]?.body))).toEqual({ token: 'private-token' })
  })
})
