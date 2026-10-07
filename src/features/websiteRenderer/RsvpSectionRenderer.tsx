import type { ReactNode } from "react";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import type { ResolvedWebsiteMedia, ResponsiveViewport, SectionComposition, WebsiteSection, WebsiteSectionAppearance } from "../websiteEditor/types";
import { SectionChildFlowRenderer } from "./SectionChildFlowRenderer";
import { SectionContentInset } from "./SectionContentInset";
import { WebsiteElementFrame } from "./WebsiteElementFrame";
import { RSVP_FORM_EDITOR_ELEMENT_ID } from "./rsvpEditorSelection";
import { INNER_SPACING_CSS, resolveInnerSpacing } from "../websiteElements/group";
import { WebsiteMotion } from "../websiteAnimation/runtime";
import { resolveRsvpSpecializedAnimation } from "../websiteAnimation/resolve";
import { rsvpMotionOwnerId } from "../websiteAnimation/identity";

export function RsvpSectionRenderer({ section, composition, specialized, mode, viewport, templateKey, library, projectColors, media, eventDate, selectedElementId, onElementSelect, onElementEdit }: {
  section: WebsiteSection;
  composition: SectionComposition;
  specialized: ReactNode;
  mode: "editor" | "public";
  viewport: ResponsiveViewport;
  templateKey: string;
  library: TemplateDesignLibrary;
  projectColors: readonly ProjectColor[];
  media: Record<string, ResolvedWebsiteMedia>;
  eventDate: string | null;
  selectedElementId?: string | null;
  onElementSelect?: (sectionId: string, elementId: string) => void;
  onElementEdit?: (sectionId: string, elementId: string) => void;
}) {
  const appearance = section.appearance as unknown as WebsiteSectionAppearance;
  const spacing = resolveInnerSpacing(appearance.innerSpacing, undefined);
  const foregroundStyle = { paddingTop: INNER_SPACING_CSS[spacing.top ?? "none"], paddingRight: INNER_SPACING_CSS[spacing.right ?? "none"], paddingBottom: INNER_SPACING_CSS[spacing.bottom ?? "none"], paddingLeft: INNER_SPACING_CSS[spacing.left ?? "none"] };
  const selectableSpecialized = mode === "editor" ? <WebsiteElementFrame
    mode="editor"
    sectionId={section.id}
    elementId={RSVP_FORM_EDITOR_ELEMENT_ID}
    elementType="RSVP form"
    selected={selectedElementId === RSVP_FORM_EDITOR_ELEMENT_ID}
    onSelect={onElementSelect}
  >
    {specialized}
  </WebsiteElementFrame> : specialized;

  const animatedSpecialized = specialized === null ? null : <WebsiteMotion ownerId={rsvpMotionOwnerId(section.id)} animation={resolveRsvpSpecializedAnimation(appearance, viewport)} className="min-w-0 max-w-full">{selectableSpecialized}</WebsiteMotion>;

  return <SectionContentInset className="relative overflow-hidden">
    <div data-rsvp-foreground className="box-border w-full" style={foregroundStyle}>
      <SectionChildFlowRenderer sectionId={section.id} flow={composition.childFlow} specialized={animatedSpecialized} mode={mode} viewport={viewport} templateKey={templateKey} library={library} projectColors={projectColors} media={media} eventDate={eventDate} context={section.resolvedDesignContext} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} />
    </div>
  </SectionContentInset>;
}
