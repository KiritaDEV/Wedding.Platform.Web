import type { ReactNode } from "react";
import { WebsiteElementFrame } from "./WebsiteElementFrame";
import { GALLERY_CONTENT_EDITOR_ELEMENT_ID } from "./rsvpEditorSelection";

export function GallerySpecializedContent({ children, mode, sectionId, selectedElementId, onElementSelect }: {
  children: ReactNode;
  mode: "editor" | "public";
  sectionId: string;
  selectedElementId?: string | null;
  onElementSelect?: (sectionId: string, elementId: string) => void;
}) {
  if (mode !== "editor") return children;
  return <WebsiteElementFrame
    mode="editor"
    sectionId={sectionId}
    elementId={GALLERY_CONTENT_EDITOR_ELEMENT_ID}
    elementType="Gallery content"
    selected={selectedElementId === GALLERY_CONTENT_EDITOR_ELEMENT_ID}
    onSelect={onElementSelect}
  >
    {children}
  </WebsiteElementFrame>;
}
