import type { ReactNode } from "react";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import type { ResolvedWebsiteMedia, ResponsiveViewport, SectionComposition, WebsiteSection } from "../websiteEditor/types";
import { SectionChildFlowRenderer } from "./SectionChildFlowRenderer";
import { SectionContentInset } from "./SectionContentInset";

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
  return <SectionContentInset className="relative overflow-hidden">
    <SectionChildFlowRenderer sectionId={section.id} flow={composition.childFlow} specialized={specialized} mode={mode} viewport={viewport} templateKey={templateKey} library={library} projectColors={projectColors} media={media} eventDate={eventDate} context={section.resolvedDesignContext} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} />
  </SectionContentInset>;
}
