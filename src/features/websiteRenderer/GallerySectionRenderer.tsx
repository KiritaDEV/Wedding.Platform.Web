import type { ReactNode } from "react";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import type { ResolvedDesignContext } from "../websiteCapabilities/types";
import type { ResolvedWebsiteMedia, ResponsiveViewport, SectionComposition, WebsiteSectionAppearance } from "../websiteEditor/types";
import { INNER_SPACING_CSS, resolveInnerSpacing } from "../websiteElements/group";
import { SectionChildFlowRenderer } from "./SectionChildFlowRenderer";

export function GallerySectionRenderer({ sectionId, composition, specialized, appearance, context, mode, viewport, templateKey, library, projectColors, media, eventDate, selectedElementId, onElementSelect, onElementEdit }: {
  sectionId: string;
  composition: SectionComposition;
  specialized: ReactNode;
  appearance: WebsiteSectionAppearance;
  context?: ResolvedDesignContext | null;
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
  const spacing = resolveInnerSpacing(appearance.innerSpacing, viewport === "desktop" ? undefined : appearance.responsive?.[viewport]?.innerSpacing);
  const foregroundStyle = {
    paddingTop: INNER_SPACING_CSS[spacing.top ?? "none"],
    paddingRight: INNER_SPACING_CSS[spacing.right ?? "none"],
    paddingBottom: INNER_SPACING_CSS[spacing.bottom ?? "none"],
    paddingLeft: INNER_SPACING_CSS[spacing.left ?? "none"],
  };
  return <div data-gallery-foreground className="box-border w-full" style={foregroundStyle}>
    <SectionChildFlowRenderer sectionId={sectionId} flow={composition.childFlow} specialized={specialized} mode={mode} viewport={viewport} templateKey={templateKey} library={library} projectColors={projectColors} media={media} eventDate={eventDate} context={context} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} />
  </div>;
}
