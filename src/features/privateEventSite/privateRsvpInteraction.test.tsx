import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PrivateInvitationRuntimeProvider } from '../websiteRenderer/PrivateInvitationRuntimeContext'
import { PrivateRsvpRuntime } from '../websiteRenderer/PrivateRsvpRuntime'
import type { PrivateInvitationRendererRuntime } from '../websiteRenderer/privateInvitationRuntime'
import { submitPrivateInvitationRsvp } from './api'
import { changedRsvpDraft, completeRsvpDraft, rsvpConfirmationMessage, rsvpSubmissionPayload } from './rsvpForm'

function runtime(overrides: Partial<PrivateInvitationRendererRuntime['rsvp']> = {}): PrivateInvitationRendererRuntime {
  return {
    linkStatus: 'current', invitationStatus: 'active', trustState: 'trusted', canOpen: false,
    opening: false, openError: false, onOpen: () => undefined,
    onSubmitRsvp: async () => { throw new Error('Unexpected submit') },
    accessBusy: false, onRequestAccess: async () => undefined, onResolveAccess: async () => undefined,
    rsvp: {
      status: 'pending', attendingCount: 0, declinedCount: 0, pendingCount: 2,
      lastUpdated: null, availability: 'open',
      guests: [
        { id: 'guest-one', name: 'Guest One', response: null },
        { id: 'guest-two', name: 'Guest Two', response: null },
      ],
      ...overrides,
    },
  }
}

function render(value: PrivateInvitationRendererRuntime): string {
  return renderToStaticMarkup(<PrivateInvitationRuntimeProvider value={value}><PrivateRsvpRuntime buttonClassName="button">Respond</PrivateRsvpRuntime></PrivateInvitationRuntimeProvider>)
}

describe('trusted private RSVP interaction', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders Pending and Partial as accessible complete-household forms without a Pending choice', () => {
    const pending = render(runtime())
    expect(pending).toContain('Guest One')
    expect(pending).toContain('value="attending"')
    expect(pending).toContain('value="declined"')
    expect(pending).not.toContain('value="pending"')
    expect(pending).toContain('type="submit"')
    expect(pending).toContain('disabled=""')

    const partial = render(runtime({
      status: 'partial', attendingCount: 1, pendingCount: 1,
      guests: [
        { id: 'guest-one', name: 'Guest One', response: 'attending' },
        { id: 'guest-two', name: 'Guest Two', response: null },
      ],
    }))
    expect(partial).toMatch(/checked="" value="attending"/)
    expect(partial.match(/checked=""/g)).toHaveLength(1)
  })

  it('renders Complete as a summary with Update RSVP only while mutation is open', () => {
    const complete = {
      status: 'complete' as const, attendingCount: 1, declinedCount: 1, pendingCount: 0,
      lastUpdated: '2026-09-24T10:00:00Z',
      guests: [
        { id: 'guest-one', name: 'Guest One', response: 'attending' as const },
        { id: 'guest-two', name: 'Guest Two', response: 'declined' as const },
      ],
    }
    const open = render(runtime(complete))
    expect(open).toContain('Update RSVP')
    expect(open).toContain('RSVP last updated')
    expect(open).not.toContain('type="radio"')

    for (const availability of ['event_closed', 'deadline_passed', 'invitation_inactive'] as const) {
      const readOnly = render(runtime({ ...complete, availability }))
      expect(readOnly).not.toContain('Update RSVP')
      expect(readOnly).not.toContain('type="radio"')
      expect(readOnly).toContain('Guest One')
    }
  })

  it('requires all Guests and detects unchanged complete drafts before transport', () => {
    const guests = runtime().rsvp!.guests
    const incomplete = { 'guest-one': 'attending' as const, 'guest-two': null }
    expect(completeRsvpDraft(guests, incomplete)).toBe(false)

    const complete = { 'guest-one': 'attending' as const, 'guest-two': 'declined' as const }
    expect(completeRsvpDraft(guests, complete)).toBe(true)
    expect(changedRsvpDraft(guests, complete)).toBe(true)
    expect(rsvpSubmissionPayload(guests, complete)).toEqual([
      { guestId: 'guest-one', response: 'attending' },
      { guestId: 'guest-two', response: 'declined' },
    ])

    const answered = runtime({
      status: 'complete', attendingCount: 1, declinedCount: 1, pendingCount: 0,
      guests: [
        { id: 'guest-one', name: 'Guest One', response: 'attending' },
        { id: 'guest-two', name: 'Guest Two', response: 'declined' },
      ],
    }).rsvp!.guests
    expect(changedRsvpDraft(answered, complete)).toBe(false)
    expect(rsvpConfirmationMessage('received')).toBe('RSVP received')
    expect(rsvpConfirmationMessage('updated')).toBe('RSVP updated')
  })

  it('bootstraps CSRF then submits the exact JSON body once and accepts canonical confirmation', async () => {
    const browser = { cookie: '' }
    const calls: Array<[RequestInfo | URL, RequestInit?]> = []
    const result = {
      data: {
        changed: true, confirmation: 'received',
        rsvp: {
          status: 'complete', attendingCount: 1, declinedCount: 0, pendingCount: 0,
          lastUpdated: '2026-09-24T10:00:00Z', availability: 'open',
          guests: [{ id: 'guest-one', name: 'Guest One', response: 'attending' }],
        },
      },
    }
    vi.stubGlobal('document', browser)
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init])
      if (String(input).endsWith('/sanctum/csrf-cookie')) {
        browser.cookie = 'XSRF-TOKEN=proof'
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))

    await expect(submitPrivateInvitationRsvp('opaque-token', [{ guestId: 'guest-one', response: 'attending' }])).resolves.toEqual(result.data)
    expect(calls).toHaveLength(2)
    expect(String(calls[0]?.[0])).toContain('/sanctum/csrf-cookie')
    expect(String(calls[1]?.[0])).toContain('/api/private-invitations/rsvp')
    expect(JSON.parse(String(calls[1]?.[1]?.body))).toEqual({
      token: 'opaque-token', responses: [{ guestId: 'guest-one', response: 'attending' }],
    })
    expect(new Headers(calls[1]?.[1]?.headers).get('X-XSRF-TOKEN')).toBe('proof')
  })
})
