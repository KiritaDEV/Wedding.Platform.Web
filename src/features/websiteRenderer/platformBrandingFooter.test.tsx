import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import fixture from '../publicEventSite/fixtures/published-public-site.json'
import type { RenderableWebsite } from '../websiteEditor/types'
import { WebsiteRenderer } from './WebsiteRenderer'
import { PublicEventSiteView } from '../../pages/PublicEventSitePage'
import { PrivateEventSiteView } from '../../pages/PrivateEventSitePage'
import type { PrivateEventSite } from '../privateEventSite/api'

const event = { ...fixture.data.event, id: 'event', type: 'wedding' as const }
const base = fixture.data.website as unknown as RenderableWebsite
const privateProps = { error: null, opening: false, openError: false, onOpen: () => undefined, onSubmitRsvp: async () => { throw new Error('Unexpected submission') }, onRetry: () => undefined }
const invitation = { linkStatus: 'current', invitationStatus: 'active', trustState: 'trusted', canOpen: false, rsvp: null } as const
const count = (html: string) => (html.match(/data-platform-branding="kirita"/g) ?? []).length

describe('platform branding presentation boundary', () => {
  for (const templateKey of ['classic-filipiniana-v1', 'modern-editorial-v1']) {
    for (const targetViewport of ['desktop', 'tablet', 'mobile'] as const) {
      for (const audience of ['public-site', 'private-site', 'management-preview'] as const) {
        it(`${templateKey} ${targetViewport} ${audience}: one footer after authored content without mutation`, () => {
          const website = structuredClone({ ...base, templateKey })
          const before = JSON.stringify(website)
          const html = renderToStaticMarkup(<WebsiteRenderer event={event} website={website} targetViewport={targetViewport} audience={audience} mode="public" />)
          expect(count(html)).toBe(1)
          expect(html.indexOf('<footer')).toBeGreaterThan(html.lastIndexOf('</article>'))
          expect(html).toContain('aria-label="Platform branding"')
          expect(html).toContain('<span>Powered by</span>')
          expect(html).toContain('alt="Kirita"')
          expect(html).toContain('branding/kirita-orange.png')
          expect(html.slice(html.indexOf('<footer'))).not.toContain('<a ')
          expect(JSON.stringify(website)).toBe(before)
        })
      }
    }
    it(`${templateKey}: disabled and empty sections retain one footer and visible order`, () => {
      const website = { ...base, templateKey, sections: base.sections.map(section => ({ ...section, isEnabled: false })) }
      const html = renderToStaticMarkup(<WebsiteRenderer event={event} website={website} mode="public" />)
      expect(count(html)).toBe(1)
      expect(html).not.toContain('data-preview-section=')
      expect(count(renderToStaticMarkup(<WebsiteRenderer event={event} website={{ ...website, sections: [] }} />))).toBe(1)
      expect(count(renderToStaticMarkup(<WebsiteRenderer event={event} website={base} mode="editor" scope={{ kind: 'single-section', sectionId: base.sections[0].id }} />))).toBe(0)
      expect(count(renderToStaticMarkup(<WebsiteRenderer event={event} website={base} mode="editor" scope={{ kind: 'full' }} />))).toBe(1)
    })
    it(`${templateKey}: empty optional sections do not move branding or reorder visible sections`, () => {
      const appearance = { headingAlignment: 'inherit', bodyAlignment: 'inherit', backgroundTreatment: 'inherit', emphasis: 'inherit' } as const
      const blank = { id: 'empty-optional', type: 'blank', isEnabled: true, designDefaults: base.sections[0].designDefaults, appearance: { shared: appearance }, content: { semantic: {}, compositions: { shared: { childFlow: { elements: [], order: [] } } } } } as unknown as RenderableWebsite['sections'][number]
      const sections = [...base.sections, blank]
      const html = renderToStaticMarkup(<WebsiteRenderer event={event} website={{ ...base, templateKey, sections }} mode="public" audience="management-preview" />)
      expect(count(html)).toBe(1)
      expect(html).not.toContain('data-preview-section="empty-optional"')
      const ids = [...html.matchAll(/data-preview-section="([^"]+)"/g)].map(match => match[1])
      expect(ids.length).toBeGreaterThan(0)
      expect(ids).toEqual(sections.filter(section => ids.includes(section.id)).map(section => section.id))
      expect(html.indexOf('<footer')).toBeGreaterThan(html.lastIndexOf('</article>'))
    })
  }
  it('real public and authorized private page paths render one footer', () => {
    expect(count(renderToStaticMarkup(<PublicEventSiteView site={{ status: 'published', event, website: base }} error={null} />))).toBe(1)
    const site: PrivateEventSite = { status: 'published', event, website: base, privateInvitation: invitation }
    expect(count(renderToStaticMarkup(<PrivateEventSiteView {...privateProps} site={site} />))).toBe(1)
  })
  it('unavailable, denied, loading and unpublished page states have no footer', () => {
    for (const error of ['unavailable', 'load', null] as const) {
      expect(count(renderToStaticMarkup(<PrivateEventSiteView {...privateProps} error={error} site={null} />))).toBe(0)
    }
    expect(count(renderToStaticMarkup(<PrivateEventSiteView {...privateProps} site={{ status: 'unpublished', event, website: null, privateInvitation: invitation }} />))).toBe(0)
    expect(count(renderToStaticMarkup(<PublicEventSiteView site={null} error="not-found" />))).toBe(0)
  })
})





