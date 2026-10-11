import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { BackgroundMediaEditor } from "./BackgroundMediaEditor";

vi.mock("../../events/workspace/EventWorkspaceContext", () => ({ useEventWorkspace: () => ({ id: "event" }) }));

const resolvedMedia = {
  "01M00000000000000000000000": { id: "01M00000000000000000000000", originalFilename: "wide.jpg", width: 1600, height: 900, web: { url: "/wide.jpg", width: 1600, height: 900 } },
};

describe("BackgroundMediaEditor", () => {
  it.each(["desktop", "tablet", "mobile"] as const)("edits the resolved owner's base image while rendering %s", (viewport) => {
    const html = renderToStaticMarkup(<MemoryRouter><BackgroundMediaEditor viewport={viewport} media={{ assetId: "01M00000000000000000000000" }} resolvedMedia={resolvedMedia} onMediaResolved={() => undefined} onChange={() => undefined} /></MemoryRouter>);
    expect(html).toContain("wide.jpg");
    expect(html).toContain("Change image");
    expect(html).toContain("Remove image");
    expect(html).not.toContain("Reset Mobile");
    expect(html).not.toContain("Using Desktop image");
    expect(html).toContain('min="1"');
    expect(html).toContain('max="3"');
    expect(html).toContain("1× fills the Hero. Increase to zoom in.");
  });

  it("shows owner-level explicit none without device-specific actions", () => {
    const html = renderToStaticMarkup(<MemoryRouter><BackgroundMediaEditor viewport="mobile" media={{ assetId: null }} resolvedMedia={resolvedMedia} onMediaResolved={() => undefined} onChange={() => undefined} /></MemoryRouter>);
    expect(html).toContain("No image selected");
    expect(html).toContain("Change image");
    expect(html).not.toContain("Remove image");
    expect(html).not.toContain("Reset Mobile image");
    expect(html).not.toContain("Focal point");
  });
});
