import type { ReactNode } from 'react'
import type { ResponsiveViewport, SectionDecorativeAppearance } from '../websiteEditor/types'
import { SectionDecorativeLayers } from './SectionDecorativeLayers'
import type { TemplateDesignLibrary } from '../websiteCapabilities/types'
import type { ProjectColor } from '../websiteColors/projectColors'

/** Keeps every ordinary Section's decoration on its outer visual surface. */
export function SectionSurfaceDecoration({ children, templateKey, appearance, viewport, library, projectColors, sectionId, mode }: {
  children: ReactNode
  templateKey: string
  appearance?: SectionDecorativeAppearance
  viewport: ResponsiveViewport
  library: TemplateDesignLibrary
  projectColors: readonly ProjectColor[]
  sectionId: string
  mode: 'editor' | 'public'
}) {
  return <>
    <SectionDecorativeLayers templateKey={templateKey} appearance={appearance} viewport={viewport} library={library} projectColors={projectColors} sectionId={sectionId} mode={mode} />
    <div data-section-foreground className="relative z-10">{children}</div>
  </>
}
