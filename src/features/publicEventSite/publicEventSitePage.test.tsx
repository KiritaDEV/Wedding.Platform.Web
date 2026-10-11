import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RenderableWebsite } from '../websiteEditor/types'
import publishedFixture from './fixtures/published-public-site.json'

vi.mock('../websiteRenderer/WebsiteRenderer', () => ({
  WebsiteRenderer: ({ website }: { website: RenderableWebsite }) => <h1 data-website-renderer>{website.templateKey}</h1>,
}))

import { getPublicEventSite } from './api'
import { PublicEventSiteContent, PublicEventSiteView } from '../../pages/PublicEventSitePage'

describe('public Event Site response handling', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('unwraps the Laravel resource envelope and renders a published Website when startTime is null', async () => {
    expect(Object.hasOwn(publishedFixture.data.website, 'name')).toBe(false)
    expect(Object.hasOwn(publishedFixture.data.website, 'eventId')).toBe(false)
    expect(publishedFixture.data.website.media).toEqual([])
    expect(publishedFixture.data.website.sections.map(({ type }) => type)).toEqual(['hero', 'gallery'])
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(publishedFixture), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    const site = await getPublicEventSite('hazel-neils-wedding')
    const markup = renderToStaticMarkup(<PublicEventSiteContent site={site} />)

    expect(site.event.startTime).toBeNull()
    expect(site.website?.media).toEqual({})
    expect(site.website?.sections.map(({ type }) => type)).toEqual(['hero', 'gallery'])
    expect(markup).toContain('data-website-renderer')
    expect(markup).toContain('classic-filipiniana-v1')
    expect(markup).not.toContain('Unable to load this event site')
  })

  it('renders the unpublished state from an unpublished Laravel resource envelope', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        status: 'unpublished',
        event: { name: "Hazel & Neil's Wedding", slug: 'hazel-neils-wedding' },
        website: null,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    const site = await getPublicEventSite('hazel-neils-wedding')
    const markup = renderToStaticMarkup(<PublicEventSiteContent site={site} />)

    expect(markup).toContain('isn’t published yet')
    expect(markup).not.toContain('Unable to load this event site')
  })

  it('renders the generic load error for a truly malformed payload', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: { status: 'published' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    await expect(getPublicEventSite('hazel-neils-wedding')).rejects.toThrow()
    const markup = renderToStaticMarkup(<PublicEventSiteView site={null} error="load" />)

    expect(markup).toContain('Unable to load this event site')
  })
})
