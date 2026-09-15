import type { ResponsiveViewport, SectionDecorativeAppearance } from '../websiteEditor/types'
import { resolveDecorativeExecution, resolveDecorativeOverlayStyle } from './templateDecorativeAssets'
import { DecorativeBackgroundLayers } from './DecorativeBackgroundLayers'
import { DecorativeAssetLayer } from './DecorativeAssetLayer'
import type { TemplateDesignLibrary } from '../websiteCapabilities/types'
import type { ProjectColor } from '../websiteColors/projectColors'
import { resolveWebsiteColor } from '../websiteColors/projectColors'
import { scopedColorPreviewTarget, useEditorColorPreview } from '../websiteEditor/colorPreview'

/** Layout-neutral decorative execution for a Section surface. */
export function SectionDecorativeLayers({ templateKey, appearance, viewport, library, projectColors = [], sectionId = '', mode = 'public', phase = 'all' }: { templateKey: string; appearance?: SectionDecorativeAppearance; viewport: ResponsiveViewport; library?: TemplateDesignLibrary; projectColors?: readonly ProjectColor[]; sectionId?: string; mode?: 'editor' | 'public'; phase?: 'all' | 'background' | 'frame' }) {
  const previewFrameColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId, 'frameColor'), mode === 'editor')
  const authoredFrameColor = library ? resolveWebsiteColor(appearance?.frame?.colorId, library, projectColors) : undefined
  const frame = resolveDecorativeExecution(templateKey, 'frame', appearance?.frame?.style, viewport, undefined, { size: appearance?.frame?.size, strength: appearance?.frame?.strength, tint: previewFrameColor ?? authoredFrameColor })
  const overlay = resolveDecorativeOverlayStyle(templateKey, appearance?.background?.overlay)

  return <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-section-decoration data-section-decoration-phase={phase}>
    {phase !== 'frame' && <DecorativeBackgroundLayers templateKey={templateKey} appearance={appearance?.background} viewport={viewport} />}
    {phase !== 'frame' && overlay && <span className="absolute inset-0 z-[4]" style={overlay} />}
    {phase !== 'background' && frame && <DecorativeAssetLayer decoration={frame} className="z-[20]" />}
  </div>
}
