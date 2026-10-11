import { describe, expect, it } from 'vitest'
import fixture from './guest-presentation.fixture.json'
import { normalizePublicEventSiteResponse } from '../publicEventSite/api'
import { normalizePrivateEventSiteResponse } from '../privateEventSite/api'

// Captured from SnapshotGuestPresentationTest using the real guest API endpoints.
describe('snapshot guest API hydration', () => {
  it('hydrates filtered public Groups and empty custom compositions through the existing contract', () => {
    const site = normalizePublicEventSiteResponse(fixture.public)
    expect(site.website?.sections.some(section => section.type === 'rsvp')).toBe(false)
    const hero = site.website?.sections.find(section => section.type === 'hero')
    expect(hero?.content.compositions.custom?.mobile?.childFlow).toEqual({ elements: [], order: [] })
    expect(JSON.stringify(site)).not.toContain('SECRET')
    expect(JSON.stringify(site)).toContain('VISIBLE')
  })

  it('hydrates private RSVP presentation separately from live invitation state', () => {
    const response = structuredClone(fixture.public)
    const privateResponse = { data: { ...response.data,
      website: { ...response.data.website, sections: [...response.data.website.sections, ...fixture.rsvpSections] },
      privateInvitation: fixture.privateInvitation } }
    const site = normalizePrivateEventSiteResponse(privateResponse)
    expect(site.website?.sections.some(section => section.type === 'rsvp')).toBe(true)
    expect(site.privateInvitation.trustState).toBe('unclaimed')
    expect(site.privateInvitation.rsvp).toBeNull()
    expect(JSON.stringify(site.website)).not.toContain('SECRET')
  })
})
