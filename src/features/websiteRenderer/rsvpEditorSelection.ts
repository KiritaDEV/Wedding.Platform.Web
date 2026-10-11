import type { SectionChildReference } from "../websiteEditor/sectionChildFlow";

export const RSVP_FORM_EDITOR_ELEMENT_ID = "rsvp-form";
export const GALLERY_CONTENT_EDITOR_ELEMENT_ID = "gallery-content";

export function editorElementId(reference: SectionChildReference | null | undefined, sectionType?: string) {
  return reference?.kind === "element"
    ? reference.id
    : reference?.kind === "specialized"
      ? sectionType === "gallery" ? GALLERY_CONTENT_EDITOR_ELEMENT_ID : RSVP_FORM_EDITOR_ELEMENT_ID
      : null;
}

export function editorElementReference(elementId: string): SectionChildReference {
  return elementId === RSVP_FORM_EDITOR_ELEMENT_ID || elementId === GALLERY_CONTENT_EDITOR_ELEMENT_ID
    ? { kind: "specialized", key: "content" }
    : { kind: "element", id: elementId };
}
