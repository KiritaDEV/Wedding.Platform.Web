import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DividerElementRenderer } from "./DividerElementRenderer";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";

const library = { colors: [{ id: "accent", displayName: "Accent", value: "#a6553f" }], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] } as unknown as TemplateDesignLibrary;
describe("DividerElementRenderer", () => {
  it("renders the Classic template default as a tintable mask", () => {
    const html = renderToStaticMarkup(<DividerElementRenderer element={{ id: "d", type: "divider", editorName: "Divider 1" }} templateKey="classic-filipiniana-v1" library={library} context={{ headingFontId: "", bodyFontId: "", headingColorId: "accent", bodyColorId: "accent", accentColorId: "accent" }} />);
    expect(html).toContain("/template-assets/classic-filipiniana/dividers/botanical-vine.png");
    expect(html).toContain('data-divider-asset="classic-divider-botanical-vine"');
    expect(html).toContain("background-color:#a6553f");
    expect(html).not.toContain("<img");
    expect(html).not.toContain('role="separator"');
    expect(html).toContain('aria-hidden="true"');
  });
  it("does not invent a procedural fallback when a template has no assets", () => {
    const published = renderToStaticMarkup(<DividerElementRenderer element={{ id: "d", type: "divider", editorName: "Divider 1" }} templateKey="modern-editorial-v1" library={library} />);
    const editor = renderToStaticMarkup(<DividerElementRenderer element={{ id: "d", type: "divider", editorName: "Divider 1" }} templateKey="modern-editorial-v1" library={library} mode="editor" />);
    expect(published).toBe("");
    expect(editor).toContain("Divider artwork is unavailable for this template");
  });
  it.each([
    ["small", "25%"],
    ["medium", "50%"],
    ["large", "75%"],
    ["full", "100%"],
  ] as const)("renders semantic width %s through the shared mapping", (width, expected) => {
    const html = renderToStaticMarkup(<DividerElementRenderer element={{ id: "d", type: "divider", editorName: "Divider 1", appearance: { width } }} templateKey="classic-filipiniana-v1" library={library} />);
    expect(html).toContain(`width:${expected}`);
  });
  it("does not substitute artwork for an unavailable authored asset", () => {
    const element = { id: "d", type: "divider" as const, editorName: "Divider 1", appearance: { assetId: "from-another-template" } };
    expect(renderToStaticMarkup(<DividerElementRenderer element={element} templateKey="classic-filipiniana-v1" library={library} />)).toBe("");
    expect(renderToStaticMarkup(<DividerElementRenderer element={element} templateKey="classic-filipiniana-v1" library={library} mode="editor" />)).toContain("data-divider-unavailable");
  });
});
