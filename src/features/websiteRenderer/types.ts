import type { EventDetail } from '../events/types'
import type { RenderableWebsite } from '../websiteEditor/types'
import type { ResponsiveViewport } from '../websiteEditor/types'
import type { TextDocument, WebsiteElement } from '../websiteElements/types'
import type { ProjectColor } from '../websiteColors/projectColors'

export type WebsiteRenderScope =
  | { kind: 'full' }
  | { kind: 'single-section'; sectionId: string }

export type WebsiteRendererProps = {
  event: Pick<EventDetail, 'id' | 'name' | 'eventDate' | 'type'>
  website: RenderableWebsite
  mode?: 'editor' | 'public'
  audience?: 'management-preview' | 'public-site'
  selectedSectionId?: string | null
  onSectionSelect?: (sectionId: string) => void
  onGalleryAdd?: (sectionId: string) => void
  targetViewport?: ResponsiveViewport
  scope?: WebsiteRenderScope
  selectedElementId?: string | null
  onElementSelect?: (sectionId: string, elementId: string) => void
  onElementEdit?: (sectionId: string, elementId: string) => void
  onElementChange?: (sectionId: string, element: WebsiteElement) => void
  onTextDocumentChange?: (sectionId: string, elementId: string, document: TextDocument) => void
  onAddColor?: (value: string) => Promise<ProjectColor>
}
