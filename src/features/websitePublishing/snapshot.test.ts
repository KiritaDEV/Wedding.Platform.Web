import { describe, expect, it } from 'vitest'
import site from '../publicEventSite/fixtures/published-public-site.json'
import { decodePublishedWebsiteSnapshot } from './snapshot'

function candidate() {
  const { media, ...website } = structuredClone(site.data.website)
  void media
  return {
    project: { id: website.id, eventId: site.data.event.id, name: 'Wedding Website' },
    event: { ...site.data.event, startsAtUtc: null },
    website,
    mediaAssetIds: [] as string[],
    sharedContentDefinitions: [],
  }
}

describe('internal published snapshot decoder', () => {
  it('captures shared Schedule definitions once and resolves only the owning snapshot Section', () => {
    const input = candidate()
    const hero = input.website.sections[0]
    const definition = { sectionId: hero.id, id: 'schedule-content', type: 'schedule', content: { days: [{ id: 'day-1', date: null, title: null, visible: true, activities: [{ id: 'entry', startTime: '10:00', title: 'Frozen ceremony', description: '' , endTime: null, location: null, mapUrl: null, imageMediaId: null, visible: true }] }] } }
    const payload = { ...input, sharedContentDefinitions: [definition], website: { ...input.website, sections: input.website.sections.map((section) => section.id !== hero.id ? section : {
      ...section, content: { semantic: {}, compositions: { shared: { childFlow: {
        elements: [{ id: 'placement', type: 'schedule', editorName: 'Schedule 1', contentId: definition.id }], order: [{ kind: 'element', id: 'placement' }],
      } } } },
    }) } }
    const decoded = decodePublishedWebsiteSnapshot(payload)
    const owned = decoded.website.sections[0].content as { sharedContentDefinitions?: Array<{ content: { days: Array<{ activities: Array<{ title: string }> }> } }> }
    expect(owned.sharedContentDefinitions![0].content.days[0].activities[0].title).toBe('Frozen ceremony')
    definition.content.days[0].activities[0].title = 'Mutable draft'
    expect(owned.sharedContentDefinitions![0].content.days[0].activities[0].title).toBe('Frozen ceremony')
    expect(() => decodePublishedWebsiteSnapshot({ ...payload, sharedContentDefinitions: [] })).toThrow()
    expect(() => decodePublishedWebsiteSnapshot({ ...payload, sharedContentDefinitions: [definition, definition] })).toThrow()
    expect(() => decodePublishedWebsiteSnapshot({ ...payload, sharedContentDefinitions: [{ ...definition, sectionId: '01K00000000000000000000000' }] })).toThrow()
    expect(() => decodePublishedWebsiteSnapshot({ ...payload, sharedContentDefinitions: [{ ...definition, type: 'text' }] })).toThrow()
    expect(() => decodePublishedWebsiteSnapshot({ ...payload, sharedContentDefinitions: [{ ...definition, content: { contentId: 'cycle' } }] })).toThrow()
  })

  it('reads a URL-free current render contract with frozen Event context', () => {
    const input = candidate()
    const frozen = decodePublishedWebsiteSnapshot(JSON.stringify(input))
    expect(frozen.website).toEqual(input.website)
    expect(frozen.event).toEqual(input.event)
    expect(frozen.website).not.toHaveProperty('media')
    input.event.name = 'Later draft'
    expect(frozen.event.name).toBe(site.data.event.name)
  })

  it('retains hidden and disabled content, paired device compositions and media IDs', () => {
    const input = candidate()
    const hero = input.website.sections[0]
    const assetId = '01K00000000000000000000000'
    const branch = {
      childFlow: {
        elements: [{ id: 'mobile-media', type: 'media', editorName: 'Media 1', isHidden: true, items: [{ id: 'mobile-item', type: 'image', mediaId: assetId, alt: 'Photo' }] }],
        order: [{ kind: 'element', id: 'mobile-media' }],
      },
    }
    Object.assign(hero.content.compositions, { custom: { mobile: branch } })
    Object.assign(hero.appearance, { custom: { mobile: hero.appearance.shared } })
    hero.isEnabled = false
    input.mediaAssetIds = [assetId]
    const decoded = decodePublishedWebsiteSnapshot(input)
    expect(decoded.website.sections[0].isEnabled).toBe(false)
    expect(decoded.website.sections[0].content.compositions.custom?.mobile).toEqual(branch)
    expect(decoded.mediaAssetIds).toEqual([assetId])
  })

  it.each([
    ['invalid JSON', () => '{'],
    ['missing fields', () => ({})],
    ['operational Event data', () => ({ ...candidate(), event: { ...candidate().event, rsvpResponses: [] } })],
    ['guest data', () => ({ ...candidate(), guests: [] })],
    ['temporary media URLs', () => ({ ...candidate(), website: { ...candidate().website, media: { url: 'https://example.test/signed' } } })],
    ['unsupported shared definitions', () => ({ ...candidate(), sharedContentDefinitions: [{ guests: [] }] })],
    ['identity mismatch', () => ({ ...candidate(), project: { ...candidate().project, eventId: '01K00000000000000000000000' } })],
    ['unknown Template identity', () => ({ ...candidate(), website: { ...candidate().website, templateKey: 'other' } })],
    ['invalid Event date', () => ({ ...candidate(), event: { ...candidate().event, eventDate: '2026-02-30' } })],
    ['invalid time', () => ({ ...candidate(), event: { ...candidate().event, startTime: '25:00' } })],
    ['invalid time zone', () => ({ ...candidate(), event: { ...candidate().event, timeZone: 'invalid' } })],
    ['unreferenced media', () => ({ ...candidate(), mediaAssetIds: ['01K00000000000000000000000'] })],
    ['unstable Section order', () => ({ ...candidate(), website: { ...candidate().website, sections: [...candidate().website.sections].reverse() } })],
    ['duplicate Section identity', () => ({ ...candidate(), website: { ...candidate().website, sections: [candidate().website.sections[0], candidate().website.sections[0]] } })],
    ['legacy content', () => {
      const input = candidate()
      Object.assign(input.website.sections[0], { content: { heading: 'Legacy' } })
      return input
    }],
    ['malformed nested Block', () => {
      const input = candidate()
      Object.assign(input.website.sections[0].content.compositions.shared.childFlow.elements[0], { invitationToken: 'secret' })
      return input
    }],
    ['malformed appearance', () => {
      const input = candidate()
      Object.assign(input.website.sections[0].appearance.shared, { height: { unit: 'px', value: -1 } })
      return input
    }],
    ['unpaired custom composition', () => {
      const input = candidate()
      Object.assign(input.website.sections[0].content.compositions, { custom: { mobile: { childFlow: { elements: [], order: [] } } } })
      return input
    }],
  ])('rejects %s', (_name, payload) => {
    expect(() => decodePublishedWebsiteSnapshot(payload())).toThrow()
  })
})
