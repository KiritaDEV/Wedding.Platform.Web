import type { ResolvedWebsiteMedia, ResponsiveViewport, SectionComposition, WebsiteSection, WebsiteSectionAppearance } from '../websiteEditor/types'
import type { TemplateDesignLibrary } from '../websiteCapabilities/types'
import type { ProjectColor } from '../websiteColors/projectColors'
import { SectionChildFlowRenderer } from './SectionChildFlowRenderer'
import { SectionContentInset } from './SectionContentInset'
import { INNER_SPACING_CSS, resolveInnerSpacing } from '../websiteElements/group'

export function BlankSectionRenderer({
  section,
  composition,
  mode,
  viewport,
  templateKey,
  library,
  projectColors,
  media,
  eventDate,
  selectedElementId,
  onElementSelect,
  onElementEdit,
}: {
  section: WebsiteSection
  composition: SectionComposition
  mode: 'editor' | 'public'
  viewport: ResponsiveViewport
  templateKey: string
  library: TemplateDesignLibrary
  projectColors: ProjectColor[]
  media: Record<string, ResolvedWebsiteMedia>
  eventDate: string | null
  selectedElementId?: string | null
  onElementSelect?: (sectionId: string, elementId: string) => void
  onElementEdit?: (sectionId: string, elementId: string) => void
}) {
  const flow = composition.childFlow
  const appearance = section.appearance as unknown as WebsiteSectionAppearance
  const hasEditorChildren = flow.elements.length > 0
  const spacing = resolveInnerSpacing(appearance.innerSpacing, viewport === 'desktop' ? undefined : appearance.responsive?.[viewport]?.innerSpacing)
  const foregroundStyle = { paddingTop: INNER_SPACING_CSS[spacing.top ?? 'none'], paddingRight: INNER_SPACING_CSS[spacing.right ?? 'none'], paddingBottom: INNER_SPACING_CSS[spacing.bottom ?? 'none'], paddingLeft: INNER_SPACING_CSS[spacing.left ?? 'none'] }
  return <SectionContentInset className="relative">
    <div data-blank-foreground className="box-border w-full" style={foregroundStyle}>
    {mode === 'editor' && !hasEditorChildren && <div data-empty-blank-section className="grid min-h-40 place-items-center rounded-md border border-dashed border-current/30 px-6 py-10 text-center">
      <div><p className="text-sm font-semibold">Empty Section</p><p className="mt-1 text-xs opacity-70">Add a block to get started</p></div>
    </div>}
    {hasEditorChildren && <SectionChildFlowRenderer
      sectionId={section.id}
      flow={flow}
      specialized={null}
      mode={mode}
      viewport={viewport}
      templateKey={templateKey}
      library={library}
      projectColors={projectColors}
      media={media}
      eventDate={eventDate}
      context={section.resolvedDesignContext}
      selectedElementId={selectedElementId}
      onElementSelect={onElementSelect}
      onElementEdit={onElementEdit}
    />}
    </div>
  </SectionContentInset>
}
