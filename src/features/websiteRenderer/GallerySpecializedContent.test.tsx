import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GALLERY_CONTENT_EDITOR_ELEMENT_ID } from "./rsvpEditorSelection";
import { GallerySpecializedContent } from "./GallerySpecializedContent";

describe("Gallery specialized canvas selection", () => {
  it("frames Gallery content for editor selection", () => {
    const html = renderToStaticMarkup(<GallerySpecializedContent mode="editor" sectionId="gallery" selectedElementId={GALLERY_CONTENT_EDITOR_ELEMENT_ID} onElementSelect={vi.fn()}><div data-gallery-collection /></GallerySpecializedContent>);
    expect(html).toContain(`data-editor-website-element="${GALLERY_CONTENT_EDITOR_ELEMENT_ID}"`);
    expect(html).toContain('data-editor-selected="true"');
    expect(html).toContain('aria-label="Select Gallery content"');
  });

  it("does not publish editor selection markup", () => {
    const html = renderToStaticMarkup(<GallerySpecializedContent mode="public" sectionId="gallery"><div data-gallery-collection /></GallerySpecializedContent>);
    expect(html).toContain("data-gallery-collection");
    expect(html).not.toContain("data-editor-website-element");
    expect(html).not.toContain("editor-selection-target");
  });
});
