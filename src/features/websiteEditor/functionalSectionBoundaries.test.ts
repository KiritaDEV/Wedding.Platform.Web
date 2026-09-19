import { describe, expect, it } from 'vitest'
import { galleryContentSchema, rsvpContentSchema } from './schemas'

const mediaId = '01J00000000000000000000000'
const flow = { elements: [], order: [{ kind: 'specialized' as const, key: 'content' as const }] }
const gallery = (items: unknown[] = []) => ({ semantic: { items }, compositions: { shared: { childFlow: flow } } })

describe('functional Section boundaries', () => {
  it('accepts the canonical Gallery collection and composition envelope', () => {
    const item = { id: 'one', type: 'image', mediaId, focalPoint: { x: .2, y: .8 }, zoom: 1.5 }
    expect(galleryContentSchema.parse(gallery([item]))).toEqual(gallery([item]))
    expect(galleryContentSchema.parse(gallery([{ id: 'incomplete', type: 'image', mediaId }]))).toBeTruthy()
    expect(galleryContentSchema.parse(gallery([{ id: 'image', type: 'image', mediaId }]))).toBeTruthy()
    expect(galleryContentSchema.parse(gallery(Array.from({ length: 24 }, (_, index) => ({ ...item, id: `item-${index}` }))))).toBeTruthy()
  })

  it('rejects duplicated, excessive, video, responsive, legacy, and duplicate-specialized Gallery state', () => {
    const item = { id: 'one', type: 'image', mediaId }
    for (const invalid of [
      gallery([item, item]),
      gallery(Array.from({ length: 25 }, (_, index) => ({ ...item, id: `item-${index}` }))),
      gallery([{ id: 'video', type: 'video', url: 'https://example.com/video.mp4' }]),
      gallery([{ ...item, alt: 'Legacy description' }]),
      gallery([{ ...item, decorative: true }]),
      { ...gallery(), semantic: { items: [], mobile: { items: [] } } },
      { semantic: { heading: 'Gallery', items: [] }, compositions: { shared: { childFlow: flow } } },
      { semantic: { items: [] }, compositions: { shared: { childFlow: { elements: [], order: [flow.order[0], flow.order[0]] } } } },
    ]) expect(galleryContentSchema.safeParse(invalid).success).toBe(false)
  })

  it('keeps RSVP specialized and composition-free', () => {
    const content = { semantic: { heading: 'Join us', description: 'Celebrate', buttonLabel: 'RSVP' } }
    expect(rsvpContentSchema.parse(content)).toEqual(content)
    expect(rsvpContentSchema.safeParse({ ...content, compositions: {} }).success).toBe(false)
  })
})
