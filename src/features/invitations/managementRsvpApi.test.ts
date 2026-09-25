import { describe, expect, it } from 'vitest'
import { parseManagementRsvpResponse } from './api'

describe('management RSVP API response', () => {
  it('accepts the endpoint lean Guest representation without edit-only wedding roles', () => {
    const result = parseManagementRsvpResponse({ data: {
      changed: true,
      rsvp: { status: 'complete', attendingCount: 2, declinedCount: 0, pendingCount: 0 },
      guests: [
        { id: 'reed', firstName: 'Reed', rsvpResponse: 'attending' },
        { id: 'sue', firstName: 'Sue', rsvpResponse: 'attending' },
      ],
      submission: null,
      lastResponse: '2026-09-25T01:00:00.000Z',
    } })

    expect(result.changed).toBe(true)
    expect(result.guests).toEqual([
      { id: 'reed', rsvpResponse: 'attending' },
      { id: 'sue', rsvpResponse: 'attending' },
    ])
  })
})
