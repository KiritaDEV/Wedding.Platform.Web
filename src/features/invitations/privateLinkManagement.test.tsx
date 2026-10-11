import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PrivateEventSite } from '../privateEventSite/api'
import { canonicalPrivateUrl, copyText } from '../privateEventSite/clipboard'
import { normalizeHistoricalLocation, privateMutationToken, shouldNormalizeHistoricalPath } from '../privateEventSite/historicalNavigation'
import { getInvitationPrivatePath, rotateInvitationPrivateLink } from './api'
import { InvitationConfirmDialog } from './components/InvitationConfirmDialog'
import { InvitationLinkRotatedDialog } from './components/InvitationLinkRotatedDialog'

afterEach(() => vi.unstubAllGlobals())

const invitationDetail = {
  id: 'invitation', customName: null, displayName: 'Household', status: 'active', canPermanentlyDelete: true,
  trustedAccess: { hasTrustedBrowser: true, hasPendingAccessRequest: true }, privateInvitation: { path: '/i/current-token' }, guests: [],
}

function historicalSite(trustState: 'trusted' | 'unclaimed' = 'trusted'): PrivateEventSite {
  return {
    status: 'unpublished', event: { name: 'Wedding', slug: 'wedding' }, website: null,
    privateInvitation: {
      linkStatus: 'historical', invitationStatus: 'active', trustState, canOpen: trustState === 'trusted',
      currentPath: trustState === 'trusted' ? '/i/new-token' : undefined, rsvp: null,
    },
  }
}

describe('private invitation link management', () => {
  it('states every rotation consequence without implying trust reset or RSVP deletion', () => {
    const html = renderToStaticMarkup(<InvitationConfirmDialog open kind="rotate-link" invitationName="Household" pending={false} error={null} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(html).toContain('Rotate private invitation link?')
    expect(html).toContain('stop working for browsers that are not already trusted')
    expect(html).toContain('trusted browser will remain trusted')
    expect(html).toContain('pending access request will be cancelled')
    expect(html).toContain('RSVP responses will not change')
    expect(html).toContain('Rotate link')
  })

  it('fetches one detail only when copy is requested and performs no mutation', async () => {
    const calls: Array<[RequestInfo | URL, RequestInit?]> = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init])
      return new Response(JSON.stringify({ data: invitationDetail }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => undefined) } })

    const path = await getInvitationPrivatePath('event', 'invitation')
    const url = canonicalPrivateUrl('https://wedding.example', path)
    await expect(copyText(url)).resolves.toBe(true)
    expect(url).toBe('https://wedding.example/i/current-token')
    expect(calls).toHaveLength(1)
    expect(calls[0]?.[1]?.method).toBe('GET')
  })

  it('CSRF-bootstraps exactly one rotation and displays only the returned new URL', async () => {
    const calls: Array<[RequestInfo | URL, RequestInit?]> = []
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=proof' })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init])
      return String(input).endsWith('/sanctum/csrf-cookie')
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify({ data: { privateInvitation: { path: '/i/new-token' }, trustedAccess: { hasTrustedBrowser: true, hasPendingAccessRequest: false } } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))

    const result = await rotateInvitationPrivateLink('event', 'invitation')
    expect(calls.map(([input]) => new URL(String(input)).pathname)).toEqual([
      '/sanctum/csrf-cookie', '/api/events/event/invitations/invitation/private-link/rotate',
    ])
    expect(calls[1]?.[1]).toMatchObject({ method: 'POST' })
    const url = canonicalPrivateUrl('https://wedding.example', result.privateInvitation.path)
    const html = renderToStaticMarkup(<InvitationLinkRotatedDialog url={url} onClose={vi.fn()} />)
    expect(html).toContain('Invitation link rotated')
    expect(html).toContain('https://wedding.example/i/new-token')
    expect(html).toContain('Copy new link')
    expect(html).not.toContain('current-token')
    expect(result.trustedAccess).toEqual({ hasTrustedBrowser: true, hasPendingAccessRequest: false })
  })

  it('copies exactly the displayed new URL without another rotation request', async () => {
    const newUrl = 'https://wedding.example/i/new-token'
    const writeText = vi.fn(async () => undefined)
    const fetch = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('fetch', fetch)

    await expect(copyText(newUrl)).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText).toHaveBeenCalledWith(newUrl)
    expect(writeText).not.toHaveBeenCalledWith('https://wedding.example/i/current-token')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('falls back inside the open modal when Clipboard API rejects', async () => {
    const field = { value: '', style: { position: '', opacity: '' }, setAttribute: vi.fn(), select: vi.fn(), remove: vi.fn() }
    const dialog = { append: vi.fn() }
    const body = { append: vi.fn() }
    const execCommand = vi.fn(() => true)
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => { throw new Error('denied') }) } })
    vi.stubGlobal('document', {
      body, createElement: vi.fn(() => field), querySelector: vi.fn(() => dialog), execCommand,
    })

    await expect(copyText('https://wedding.example/i/new-token')).resolves.toBe(true)
    expect(dialog.append).toHaveBeenCalledWith(field)
    expect(body.append).not.toHaveBeenCalled()
    expect(field.select).toHaveBeenCalledOnce()
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(field.remove).toHaveBeenCalledOnce()
  })

  it('retains the body fallback without Clipboard API and reports fallback failure safely', async () => {
    const field = { value: '', style: { position: '', opacity: '' }, setAttribute: vi.fn(), select: vi.fn(), remove: vi.fn() }
    const body = { append: vi.fn() }
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('document', {
      body, createElement: vi.fn(() => field), querySelector: vi.fn(() => null), execCommand: vi.fn(() => false),
    })

    await expect(copyText('https://wedding.example/i/new-token')).resolves.toBe(false)
    expect(body.append).toHaveBeenCalledWith(field)
    expect(field.remove).toHaveBeenCalledOnce()
  })

  it('normalizes only trusted historical runtime and uses the canonical token for mutations', () => {
    const trusted = historicalSite()
    const navigate = vi.fn()
    expect(shouldNormalizeHistoricalPath(trusted)).toBe(true)
    expect(normalizeHistoricalLocation(trusted, navigate)).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/i/new-token', { replace: true })
    expect(privateMutationToken(trusted, 'old-token')).toBe('new-token')

    const untrusted = historicalSite('unclaimed')
    expect(shouldNormalizeHistoricalPath(untrusted)).toBe(false)
    expect(normalizeHistoricalLocation(untrusted, navigate)).toBe(false)
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(privateMutationToken(untrusted, 'old-token')).toBe('old-token')
  })
})
