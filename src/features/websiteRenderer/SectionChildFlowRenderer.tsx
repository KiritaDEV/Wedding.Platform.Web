import { isElementRenderable } from "./elementRenderability";
import { useDecorativeSourceAvailability } from "./decorativeSourceAvailability";
import type { CSSProperties, ReactNode } from "react";
import type { ResolvedDesignContext, TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import type { SectionChildFlow } from "../websiteEditor/sectionChildFlow";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { SectionRootFlow } from "./SectionRootFlow";
import { WebsiteLeafElementRenderer } from "./WebsiteLeafElementRenderer";
import { WebsiteElementFrame } from "./WebsiteElementFrame";
import { GroupElementRenderer } from "./GroupElementRenderer";
import { OuterSpacingWrapper } from "./OuterSpacingWrapper";
import { sectionChildWidth } from "./sectionChildWidth";

export function SectionChildFlowRenderer({ sectionId, flow, specialized, mode, viewport, templateKey, library, projectColors, media = {}, eventDate = null, context, selectedElementId, onElementSelect, onElementEdit, semanticChildWidths = false, inlineAlignment }: {
  sectionId: string;
  flow: SectionChildFlow; specialized: ReactNode; mode: "editor" | "public"; viewport: ResponsiveViewport;
  templateKey: string; library: TemplateDesignLibrary; projectColors: readonly ProjectColor[]; context?: ResolvedDesignContext | null;
  selectedElementId?: string | null; onElementSelect?: (sectionId: string, elementId: string) => void;
  onElementEdit?: (sectionId: string, elementId: string) => void;
  media?: import("../websiteEditor/types").WebsiteDraft["media"];
  eventDate?: string | null;
  semanticChildWidths?: boolean;
  inlineAlignment?: CSSProperties["alignItems"];
}) {
  useDecorativeSourceAvailability();
  const elements = new Map(flow.elements.map((element) => [element.id, element]));
  return <SectionRootFlow inlineAlignment={inlineAlignment}>{flow.order.map((reference) => {
    if (reference.kind === "specialized") return <div key="specialized:content">{specialized}</div>;
    const element = elements.get(reference.id);
    if (!element || !isElementRenderable(element, templateKey, mode, media, eventDate)) return null;
    const selected = selectedElementId === element.id;
    return <OuterSpacingWrapper key={element.id} element={element} viewport={viewport} sectionId={sectionId} selected={selected} onSelect={onElementSelect} onEdit={element.type === "text" ? onElementEdit : undefined} width={semanticChildWidths ? sectionChildWidth(element) : "container"}><WebsiteElementFrame mode={mode} sectionId={sectionId} elementId={element.id} elementType={element.type === "compositionGroup" ? "Group" : element.type === "media" ? "Media" : element.type} selected={selected} onSelect={onElementSelect} onEdit={element.type === "text" ? onElementEdit : undefined}>
      {element.type === "compositionGroup" ? <GroupElementRenderer media={media} eventDate={eventDate} group={element} sectionId={sectionId} mode={mode} viewport={viewport} templateKey={templateKey} library={library} projectColors={projectColors} context={context} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} /> : <WebsiteLeafElementRenderer media={media} eventDate={eventDate} element={element} mode={mode} sectionId={sectionId} selected={selected} viewport={viewport} templateKey={templateKey} library={library} projectColors={projectColors} context={context} />}
    </WebsiteElementFrame></OuterSpacingWrapper>;
  })}</SectionRootFlow>;
}
