import { describe, expect, it } from "vitest";
import {
  GALLERY_CONTENT_EDITOR_ELEMENT_ID,
  RSVP_FORM_EDITOR_ELEMENT_ID,
  editorElementId,
  editorElementReference,
} from "./rsvpEditorSelection";

describe("RSVP form canvas selection", () => {
  it("maps the specialized RSVP form between the canvas and Structure selection", () => {
    const reference = { kind: "specialized", key: "content" } as const;

    expect(editorElementId(reference)).toBe(RSVP_FORM_EDITOR_ELEMENT_ID);
    expect(editorElementReference(RSVP_FORM_EDITOR_ELEMENT_ID)).toEqual(reference);
  });

  it("maps specialized Gallery content independently from the RSVP form", () => {
    const reference = { kind: "specialized", key: "content" } as const;

    expect(editorElementId(reference, "gallery")).toBe(GALLERY_CONTENT_EDITOR_ELEMENT_ID);
    expect(editorElementReference(GALLERY_CONTENT_EDITOR_ELEMENT_ID)).toEqual(reference);
  });

  it("leaves authored element selections unchanged", () => {
    expect(editorElementId({ kind: "element", id: "supporting-text" })).toBe("supporting-text");
    expect(editorElementReference("supporting-text")).toEqual({ kind: "element", id: "supporting-text" });
  });
});
