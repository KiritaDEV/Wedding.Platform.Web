import { describe, expect, it } from 'vitest'
import { sectionsForAudience } from '../websiteRenderer/audience'

describe('real public Event Site audience', () => {
  const sections = [{ type: 'hero' }, { type: 'rsvp' }, { type: 'gallery' }]

  it('omits RSVP only for the real public site', () => {
    expect(sectionsForAudience(sections, 'public-site').map(({ type }) => type)).toEqual(['hero', 'gallery'])
    expect(sectionsForAudience(sections, 'private-site')).toEqual(sections)
    expect(sectionsForAudience(sections, 'management-preview')).toEqual(sections)
    expect(sectionsForAudience(sections, undefined)).toEqual(sections)
  })
})
