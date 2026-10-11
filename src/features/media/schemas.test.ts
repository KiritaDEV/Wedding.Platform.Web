import { describe, expect, it } from 'vitest'
import { mediaAssetSchema, mediaDeleteConflictSchema, mediaUsageSchema } from './schemas'
import { hasMediaWebVariant, mediaUsageKey, mediaUsageRemovalHelp, mediaUsageSummary } from './types'

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
      source: 'draft',
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

  it('distinguishes draft, snapshot and combined usage and keeps their row identities distinct', () => {
    const draft = mediaAssetSchema.parse(asset({ type: 'sectionMedia', compositionScope: 'shared', elementId: 'media', itemId: 'item' })).usage.references[0]
    const snapshot = { ...draft, source: 'publishedSnapshot' as const }
    expect(mediaUsageSummary({ isInUse: true, references: [draft] })).toBe('Working draft')
    expect(mediaUsageSummary({ isInUse: true, references: [snapshot] })).toBe('Published snapshot')
    const both = mediaUsageSchema.parse({ isInUse: true, references: [draft, snapshot] })
    expect(mediaUsageSummary(both)).toBe('Draft and snapshot')
    expect(mediaUsageKey(draft)).not.toBe(mediaUsageKey(snapshot))
    expect(mediaUsageKey(draft)).not.toBe(mediaUsageKey({ ...draft, reference: { type: 'sectionMedia', compositionScope: 'custom/mobile', elementId: 'media', itemId: 'item' } }))
    expect(mediaUsageRemovalHelp(both)).toContain('including inactive projects')
    expect(mediaUsageRemovalHelp(both)).toContain('Unpublishing does not release')
    expect(mediaDeleteConflictSchema.parse({ code: 'media_asset_in_use', message: 'In use', usage: both }).usage.references).toHaveLength(2)
  })

  it('keeps damaged assets manageable but does not allow picking an asset without a web variant', () => {
    const input = asset({ type: 'sectionMedia' })
    const missingWeb = { ...input, variants: { thumbnail: input.variants.thumbnail } }
    const parsed = mediaAssetSchema.parse(missingWeb)
    expect(hasMediaWebVariant(parsed)).toBe(false)
    expect(hasMediaWebVariant(mediaAssetSchema.parse(input))).toBe(true)
    expect(mediaAssetSchema.parse({ ...input, variants: {} }).variants).toEqual({})
  })

  it('rejects unknown usage sources instead of hiding their retention meaning', () => {
    const input = asset({ type: 'sectionMedia' })
    Object.assign(input.usage.references[0], { source: 'history' })
    expect(mediaAssetSchema.safeParse(input).success).toBe(false)
  })
})
