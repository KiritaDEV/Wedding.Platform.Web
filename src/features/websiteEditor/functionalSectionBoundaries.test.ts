import { describe, expect, it } from 'vitest'
import { galleryContentSchema, rsvpContentSchema } from './schemas'

describe('functional Section ownership boundaries', () => {
  it('keeps Gallery semantic-only with one authoritative empty collection', () => {
    const content = { semantic: { heading: 'Our moments', items: [] } }
    expect(galleryContentSchema.parse(content)).toEqual(content)
    expect(galleryContentSchema.safeParse({ ...content, compositions: { shared: { childFlow: { elements: [], order: [] } } } }).success).toBe(false)
    expect(galleryContentSchema.safeParse({ semantic: { ...content.semantic, mobile: { items: [] } } }).success).toBe(false)
    expect(galleryContentSchema.safeParse({ semantic: { heading: 'Our moments', items: [{ mediaId: 'asset' }] } }).success).toBe(false)
  })

  it('keeps RSVP semantic-only without device-scoped or duplicated presentation state', () => {
    const content = { semantic: { heading: 'Will you join us?', description: 'We hope you can celebrate with us.', buttonLabel: 'RSVP' } }
    expect(rsvpContentSchema.parse(content)).toEqual(content)
    expect(rsvpContentSchema.safeParse({ ...content, compositions: { shared: { childFlow: { elements: [], order: [] } } } }).success).toBe(false)
    expect(rsvpContentSchema.safeParse({ semantic: { ...content.semantic, desktop: { buttonLabel: 'Respond' } } }).success).toBe(false)
    expect(rsvpContentSchema.safeParse({ semantic: { ...content.semantic, configuration: { responseTarget: 'other' } } }).success).toBe(false)
  })
})
