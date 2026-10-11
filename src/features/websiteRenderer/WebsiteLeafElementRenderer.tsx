import { scopedColorPreviewTarget, useEditorColorPreview } from "../websiteEditor/colorPreview";
import type { WebsiteLeafElement } from "../websiteElements/types";
import { TextElementRenderer, type TextElementRendererProps } from "./TextElementRenderer";
import { useWebsiteElementChange } from "./WebsiteElementChangeContext";
import { DividerElementRenderer } from "./DividerElementRenderer";
import { MediaElementRenderer } from "./MediaElementRenderer";
import { DateElementRenderer } from "./DateElementRenderer";
import { AccordionElementRenderer } from "./AccordionElementRenderer";
import { ScheduleElementRenderer } from "./ScheduleElementRenderer";
import { PeopleElementRenderer } from "./PeopleElementRenderer";
import { CountdownElementRenderer } from "./CountdownElementRenderer";

type Props = Omit<TextElementRendererProps, "element" | "editor" | "previewColor" | "previewTextShadowColor" | "previewGlowColor"> & { element: WebsiteLeafElement; mode?: "editor" | "public"; sectionId?: string; selected?: boolean; media?: import("../websiteEditor/types").WebsiteDraft["media"]; eventDate?: string | null };

/** Exhaustive public/editor dispatch seam for Section leaf elements. */
export function WebsiteLeafElementRenderer({ element, mode = "public", sectionId, selected = false, media = {}, eventDate = null, ...context }: Props) {
  const previewColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId ?? "", `${element.id}:color`), mode === "editor");
  const previewTextShadowColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId ?? "", `${element.id}:textShadowColor`), mode === "editor");
  const previewDividerShadowColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId ?? "", `${element.id}:shadowColor`), mode === "editor");
  const previewGlowColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId ?? "", `${element.id}:glowColor`), mode === "editor");
  const changes = useWebsiteElementChange();
  let content;
  if (element.type === "text") content = <TextElementRenderer previewColor={previewColor} previewTextShadowColor={previewTextShadowColor} previewGlowColor={previewGlowColor} element={element} editor={mode === "editor" && selected && sectionId && changes.onTextDocumentChange && changes.onAddColor ? { onDocumentChange: (elementId, document) => changes.onTextDocumentChange?.(sectionId, elementId, document), onAddColor: changes.onAddColor } : undefined} {...context} />;
  else if (element.type === "divider") content = <DividerElementRenderer previewColor={previewColor} previewShadowColor={previewDividerShadowColor} previewGlowColor={previewGlowColor} element={element} mode={mode} {...context} />;
  else if (element.type === "media") content = <MediaElementRenderer element={element} mode={mode} viewport={context.viewport} media={media} />;
  else if (element.type === "date") content = <DateElementRenderer previewColor={previewColor} previewTextShadowColor={previewTextShadowColor} previewGlowColor={previewGlowColor} element={element} eventDate={eventDate} mode={mode} {...context} />;
  else if (element.type === "accordion") content = <AccordionElementRenderer element={element} mode={mode} />;
  else if (element.type === "schedule") content = <ScheduleElementRenderer element={element} mode={mode} templateKey={context.templateKey} />;
  else if (element.type === "people") content = <PeopleElementRenderer element={element} mode={mode} templateKey={context.templateKey} media={media} />;
  else if (element.type === "countdown") content = <CountdownElementRenderer sectionId={sectionId} element={element} mode={mode} {...context} />;
  else return mode === "editor" ? <div data-unsupported-website-element role="status">Unsupported element: {element.type}</div> : null;
  return content;
}
