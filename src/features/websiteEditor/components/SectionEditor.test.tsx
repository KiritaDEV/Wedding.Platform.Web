import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { WebsiteSection } from "../types";
import { SectionEditor } from "./SectionEditor";

const gallery = {
  id: "gallery",
  type: "gallery",
  displayName: "Gallery",
  editorName: "Gallery",
  sortOrder: 1,
  isEnabled: true,
  content: { semantic: { items: [] }, compositions: { shared: { childFlow: { elements: [], order: [{ kind: "specialized", key: "content" }] } } } },
  appearance: { shared: {} },
} as unknown as WebsiteSection;

describe("Gallery Section content ownership", () => {
  it("keeps image assets out of the parent Gallery Content tab", () => {
    const html = renderToStaticMarkup(<SectionEditor
      section={gallery}
      content={gallery.content}
      resolvedMedia={{}}
      onMediaResolved={vi.fn()}
      onChange={vi.fn()}
      galleryContentSelected={false}
    />);

    expect(html).toContain("Select Gallery content");
    expect(html).not.toContain("Add images");
    expect(html).not.toContain("data-gallery-collection-editor");
  });
});
