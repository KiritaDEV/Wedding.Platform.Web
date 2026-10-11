import { describe, expect, it } from 'vitest'
import { addGalleryImage, addGalleryImages, duplicateGalleryItem, frameGalleryItem, removeGalleryItem, reorderGalleryItem, replaceGalleryImage } from './gallery'
import { galleryContentSchema } from './schemas'
import { canonicalizeWebsiteSectionContentForApi } from './api'
import type { GalleryItem } from './types'

const first = '01J00000000000000000000000'
const second = '01J00000000000000000000001'
const item: GalleryItem = { id: 'item', type: 'image', mediaId: first, focalPoint: { x: .2, y: .8 }, zoom: 1.5 }
const content = (items: unknown[]) => ({ semantic: { items }, compositions: { shared: { childFlow: { elements: [], order: [{ kind: 'specialized', key: 'content' }] } } } })

describe('Gallery item operations', () => {
  it('accepts only the canonical Gallery item shape', () => {
    expect(galleryContentSchema.safeParse(content([{ id: 'image', type: 'image', mediaId: first }])).success).toBe(true)
    expect(galleryContentSchema.safeParse(content([{ ...item, alt: 'Legacy' }])).success).toBe(false)
    expect(galleryContentSchema.safeParse(content([{ ...item, decorative: true }])).success).toBe(false)
    expect(galleryContentSchema.safeParse(content([{ ...item, caption: 'Unsupported' }])).success).toBe(false)
  })

  it('adds a canonical item immediately and guards the 24-item capacity', () => {
    const added = addGalleryImage([], first)
    expect(added[0]).toEqual({ id: expect.any(String), type: 'image', mediaId: first })
    const items = Array.from({ length: 23 }, (_, index) => ({ ...item, id: `item-${index}` }))
    expect(addGalleryImage(items, second)).toHaveLength(24)
    const full = duplicateGalleryItem(items, items[0].id)
    expect(full).toHaveLength(24)
    expect(addGalleryImage(full, second)).toBe(full)
    expect(duplicateGalleryItem(full, full[0].id)).toBe(full)
  })

  it('adds a deterministic canonical batch without exceeding capacity', () => {
    const existing = Array.from({ length: 22 }, (_, index) => ({ ...item, id: `item-${index}` }))
    const added = addGalleryImages(existing, [first, second, first])
    expect(added).toHaveLength(24)
    expect(added.slice(22).map(({ mediaId }) => mediaId)).toEqual([first, second])
    expect(added.slice(22).every(({ id }) => !existing.some((source) => source.id === id))).toBe(true)
    expect(added.slice(22)).toEqual([
      { id: expect.any(String), type: 'image', mediaId: first },
      { id: expect.any(String), type: 'image', mediaId: second },
    ])
    expect(addGalleryImages(added, [first])).toBe(added)
  })

  it('edits and sparsely resets bounded framing without changing other items', () => {
    const other = { ...item, id: 'other' }
    const framed = frameGalleryItem([item, other], item.id, { x: -1, y: 2 }, 4)
    expect(framed[0]).toEqual({ ...item, focalPoint: { x: 0, y: 1 }, zoom: 3 })
    expect(framed[1]).toBe(other)
    expect(frameGalleryItem(framed, item.id, { x: .5, y: .5 }, 1)[0]).toEqual({ id: item.id, type: 'image', mediaId: first })
  })

  it.each(['desktop', 'tablet', 'mobile'])('round-trips canonical framing and operations while editing %s', () => {
    let current = galleryContentSchema.parse(content([item]))
    const save = (items: GalleryItem[]) => {
      current = galleryContentSchema.parse(JSON.parse(JSON.stringify(canonicalizeWebsiteSectionContentForApi({ ...current, semantic: { items } }))))
      return current.semantic.items
    }
    let items = save(frameGalleryItem([item], item.id, { x: .125, y: .875 }, 2.3))
    items = save(addGalleryImage(items, second))
    const addedId = items[1].id
    items = save(reorderGalleryItem(items, 1, 0))
    expect(items[0].id).toBe(addedId)
    items = save(duplicateGalleryItem(items, item.id))
    expect(items[2]).toMatchObject({ mediaId: first, focalPoint: { x: .125, y: .875 }, zoom: 2.3 })
    expect(items[2].id).not.toBe(item.id)
    expect(items[2]).not.toHaveProperty('alt')
    expect(items[2]).not.toHaveProperty('decorative')
    items = save(replaceGalleryImage(items, item.id, second))
    expect(items[1]).toEqual({ id: item.id, type: 'image', mediaId: second })
    items = save(removeGalleryItem(items, item.id))
    expect(items.map(({ id }) => id)).not.toContain(item.id)
  })

  it('does not churn replacement for the same source', () => {
    expect(replaceGalleryImage([item], item.id, first)[0]).toBe(item)
  })

  it('duplicates media and framing with a new identity and no removed fields', () => {
    const duplicate = duplicateGalleryItem([item], item.id)[1]
    expect(duplicate).toEqual({ ...item, id: expect.any(String) })
    expect(duplicate.id).not.toBe(item.id)
    expect(duplicate).not.toHaveProperty('alt')
    expect(duplicate).not.toHaveProperty('decorative')
  })

  it('reorders without changing item identity or framing', () => {
    const other = { ...item, id: 'other', mediaId: second }
    expect(reorderGalleryItem([item, other], 0, 1)).toEqual([other, item])
  })
})
