import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MediaDeleteDialog } from './MediaDeleteDialog'
import { MediaUsageIndicator } from './MediaUsageIndicator'
import { MediaAssetCard } from './MediaAssetCard'
import { MediaAssetViewer } from './MediaAssetViewer'
import type { MediaAsset } from '../types'

vi.mock('../../../components/ui/Dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
  DialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

function asset(): MediaAsset {
  const draft = { source: 'draft' as const, mediaId: 'asset', eventId: 'event', websiteProjectId: 'project', websiteProjectName: 'Project',
    sectionId: 'section', sectionType: 'hero', sectionName: 'Hero', reference: { type: 'sectionMedia' as const, compositionScope: 'shared', elementId: 'image' } }
  return { id: 'asset', originalFilename: 'photo.jpg', mimeType: 'image/jpeg', width: 1200, height: 800, sizeBytes: 100,
    createdAt: '2026-10-09T00:00:00Z', variants: {}, usage: { isInUse: true, references: [draft, { ...draft, source: 'publishedSnapshot' }] } }
}

describe('Media Library lifecycle feedback', () => {
  it('shows both usage sources and explains why unpublishing cannot release retention', () => {
    const html = renderToStaticMarkup(<MediaDeleteDialog asset={asset()} onClose={() => undefined} onDelete={async () => undefined} />)
    expect(html).toContain('Unable to delete image')
    expect(html).toContain('Working draft')
    expect(html).toContain('Published snapshot')
    expect(html).toContain('including inactive projects')
    expect(html).toContain('Unpublishing does not release snapshot references')
    expect(html).not.toContain('Try again')
  })

  it('distinguishes combined usage in the existing card indicator', () => {
    const html = renderToStaticMarkup(<MediaUsageIndicator usage={asset().usage} />)
    expect(html).toContain('Draft and snapshot')
  })

  it('renders missing variants safely while retaining the delete control', () => {
    const html = renderToStaticMarkup(<MediaAssetCard asset={asset()} onDelete={() => undefined} onView={() => undefined} />)
    expect(html).toContain('Thumbnail unavailable')
    expect(html).toContain('Delete photo.jpg')
    const preview = renderToStaticMarkup(<MediaAssetViewer asset={asset()} onClose={() => undefined} />)
    expect(preview).toContain('Unable to load this Media preview')
    expect(preview).not.toContain('Loading preview')
  })
})
