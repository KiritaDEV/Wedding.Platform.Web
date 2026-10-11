import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetInvitationTrustedAccess } from './api'
import { InvitationConfirmDialog } from './components/InvitationConfirmDialog'

afterEach(() => vi.unstubAllGlobals())

describe('trusted access reset', () => {
  it('uses explicit confirmation copy that preserves RSVP responses and the private link', () => {
    const html = renderToStaticMarkup(<InvitationConfirmDialog open kind="reset-access" invitationName="Household" pending={false} error={null} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(html).toContain('Reset trusted access?')
    expect(html).toContain('revoke access from the currently trusted browser')
    expect(html).toContain('cancel any pending access request')
    expect(html).toContain('RSVP responses and the private invitation link will not change')
    expect(html).toContain('Reset access')
    expect(html).toContain('Cancel')
  })

  it('shows a safe error and disables confirmation while a reset is pending', () => {
    const html = renderToStaticMarkup(<InvitationConfirmDialog open kind="reset-access" invitationName="Household" pending error="Unable to reset trusted access." onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('Unable to reset trusted access.')
    expect(html).toContain('Working…')
    expect(html.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('CSRF-bootstraps one management DELETE and accepts only the minimal result', async () => {
    const calls: Array<[RequestInfo | URL, RequestInit?]> = []
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=proof' })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init])
      return String(input).endsWith('/sanctum/csrf-cookie')
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify({ data: { changed: true, trustState: 'unclaimed', hasPendingAccessRequest: false } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))

    await expect(resetInvitationTrustedAccess('event id', 'invitation id')).resolves.toEqual({ changed: true, trustState: 'unclaimed', hasPendingAccessRequest: false })
    expect(calls.map(([input]) => new URL(String(input)).pathname)).toEqual([
      '/sanctum/csrf-cookie', '/api/events/event%20id/invitations/invitation%20id/trusted-access',
    ])
    expect(calls[1]?.[1]).toMatchObject({ method: 'DELETE' })
    expect(calls[1]?.[1]?.body).toBeUndefined()
  })
})
