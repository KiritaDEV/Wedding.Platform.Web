import type { ResolvedWebsiteMedia, ResponsiveViewport, SectionComposition, WebsiteSection, WebsiteSectionAppearance } from '../websiteEditor/types'
import type { TemplateDesignLibrary } from '../websiteCapabilities/types'
import type { ProjectColor } from '../websiteColors/projectColors'
import { BackgroundMediaLayer } from './BackgroundMediaLayer'
import { SectionDecorativeLayers } from './SectionDecorativeLayers'
import { SectionChildFlowRenderer } from './SectionChildFlowRenderer'
import { heroContentPositionStyle, resolveHeroContentPosition } from './heroContentPosition'
import { INNER_SPACING_CSS, resolveInnerSpacing } from '../websiteElements/group'
import { resolveMediaPresentation } from '../websiteElements/media'

export function HeroSectionRenderer({ section, composition, mode, viewport, templateKey, library, projectColors, media, eventDate, selectedElementId, onElementSelect, onElementEdit }: {
  section: WebsiteSection
  composition: SectionComposition
  mode: 'editor' | 'public'
  viewport: ResponsiveViewport
  templateKey: string
  library: TemplateDesignLibrary
  projectColors: readonly ProjectColor[]
  media: Record<string, ResolvedWebsiteMedia>
  eventDate: string | null
  selectedElementId?: string | null
  onElementSelect?: (sectionId: string, elementId: string) => void
  onElementEdit?: (sectionId: string, elementId: string) => void
}) {
  const appearance = section.appearance as unknown as WebsiteSectionAppearance
  const reference = appearance.backgroundMedia
  const decoration = appearance.decorativeAppearance
  const screen = appearance.height === 'screen'
  const hasChildren = composition.childFlow.elements.length > 0
  const contentPosition = resolveHeroContentPosition(appearance, viewport)
  const positionStyle = heroContentPositionStyle(contentPosition)
  const innerSpacing = resolveInnerSpacing(appearance.innerSpacing, viewport === 'desktop' ? undefined : appearance.responsive?.[viewport]?.innerSpacing)
  const hasFullWidthRoot = composition.childFlow.order.some((reference) => {
    if (reference.kind !== 'element') return false
    const element = composition.childFlow.elements.find(({ id }) => id === reference.id)
    if (element?.type === 'compositionGroup') return (element.layout?.width ?? 'full') === 'full'
    return element?.type === 'media' && resolveMediaPresentation(element, viewport).width === 'full'
  })

  return <div data-hero-shell data-section-full-bleed className={`relative isolate w-full overflow-x-clip ${screen ? 'min-h-[100svh]' : ''}`}>
    <BackgroundMediaLayer ownerId={section.id} kind="hero" reference={reference} media={media} viewport={viewport} opacity={appearance.backgroundImageOpacity} />
    <SectionDecorativeLayers templateKey={templateKey} appearance={decoration} viewport={viewport} phase="background" />
    <div data-hero-foreground data-hero-content-position={contentPosition} className="relative z-10 flex min-h-[inherit] w-full flex-col box-border" style={{ ...positionStyle, paddingTop: INNER_SPACING_CSS[innerSpacing.top ?? 'none'], paddingRight: INNER_SPACING_CSS[innerSpacing.right ?? 'none'], paddingBottom: INNER_SPACING_CSS[innerSpacing.bottom ?? 'none'], paddingLeft: INNER_SPACING_CSS[innerSpacing.left ?? 'none'] }}>
      {mode === 'editor' && !hasChildren && <div data-empty-hero-section className="grid min-h-40 place-items-center rounded-md border border-dashed border-current/30 px-6 py-10 text-center"><div><p className="text-sm font-semibold">Empty Hero</p><p className="mt-1 text-xs opacity-70">Add a block to get started</p></div></div>}
      {hasChildren && <div data-hero-content-cluster style={{ width: hasFullWidthRoot ? '100%' : 'fit-content', maxWidth: '100%' }}><SectionChildFlowRenderer sectionId={section.id} flow={composition.childFlow} specialized={null} mode={mode} viewport={viewport} templateKey={templateKey} library={library} projectColors={projectColors} media={media} eventDate={eventDate} context={section.resolvedDesignContext} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} /></div>}
    </div>
    <SectionDecorativeLayers templateKey={templateKey} appearance={decoration} viewport={viewport} phase="frame" />
  </div>
}
