import { describe, expect, it } from 'vitest'
import { mediaAssetSchema } from './schemas'

const asset = (reference: Record<string, unknown>) => ({
  id: 'asset',
  originalFilename: 'photo.jpg',
  mimeType: 'image/jpeg',
  width: 1200,
  height: 800,
  sizeBytes: 100,
  createdAt: '2026-09-13T00:00:00.000Z',
  variants: {
    thumbnail: { width: 800, height: 533, url: 'http://localhost/media/thumbnail' },
    web: { width: 1200, height: 800, url: 'http://localhost/media/web' },
  },
  usage: {
    isInUse: true,
    references: [{
      mediaId: 'asset', eventId: 'event', websiteProjectId: 'website', websiteProjectName: 'Website',
      sectionId: 'section', sectionType: 'blank', sectionName: 'Section', reference,
    }],
  },
})

describe('media asset API schema', () => {
  it('accepts composition-scoped Media usage returned by the API', () => {
    expect(mediaAssetSchema.parse(asset({
      type: 'sectionMedia', compositionScope: 'custom/mobile', elementId: 'media', itemId: 'item',
    })).usage.references).toHaveLength(1)
  })

  it('accepts composition-scoped People usage returned by the API', () => {
    expect(mediaAssetSchema.parse(asset({
      type: 'person', compositionScope: 'shared', elementId: 'people', groupId: 'group',
      groupLabel: 'Family', personId: 'person', label: 'Neil',
    })).usage.references).toHaveLength(1)
  })

  it('accepts appearance-scoped Hero background usage without composition context', () => {
    expect(mediaAssetSchema.parse(asset({ type: 'sectionMedia', appearanceScope: 'appearance/desktop' })).usage.references).toHaveLength(1)
  })

  it('rejects unknown appearance scopes without weakening the strict usage contract', () => {
    expect(mediaAssetSchema.safeParse(asset({ type: 'sectionMedia', appearanceScope: 'appearance/watch' })).success).toBe(false)
  })
})
