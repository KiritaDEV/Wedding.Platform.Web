import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import fixture from '../publicEventSite/fixtures/published-public-site.json'
import { WebsitePreviewPage } from '../../pages/workspace/WebsitePreviewPage'

vi.mock('../events/workspace/useEventDetail', () => ({ useEventDetail: () => ({ isLoading: false, error: null, event: { ...fixture.data.event, type: 'wedding' } }) }))
vi.mock('../websiteEditor/useWebsiteDraft', () => ({ useWebsiteDraft: () => ({ isLoading: false, isUninitialized: false, error: null, draft: fixture.data.website }) }))

it('saved-draft preview uses the real renderer and adds exactly one footer without mutating the saved draft', () => {
  const before = JSON.stringify(fixture)
  const html = renderToStaticMarkup(<MemoryRouter><WebsitePreviewPage /></MemoryRouter>)
  expect(html.match(/data-platform-branding="kirita"/g)).toHaveLength(1)
  expect(html.indexOf('<footer')).toBeGreaterThan(html.lastIndexOf('</article>'))
  expect(JSON.stringify(fixture)).toBe(before)
})
