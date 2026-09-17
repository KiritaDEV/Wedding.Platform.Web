import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { TextElement } from "../websiteElements/types";
import { TextElementRenderer } from "./TextElementRenderer";
import { elementFontSizes } from "./elementTypography";
import { TEXT_SIZES } from "../websiteElements/text";

const library = { colors: [{ id: "body", displayName: "Body", value: "#112233" }, { id: "green", displayName: "Green", value: "#008000" }, { id: "blue", displayName: "Blue", value: "#0000FF" }], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] } as unknown as TemplateDesignLibrary;
const base: TextElement = { id: "t", type: "text", editorName: "Text 1", document: { type: "doc", children: [{ type: "paragraph", children: [{ text: "Hello ", marks: { bold: true } }, { text: "world" }] }] } };
const render = (element: TextElement, viewport: "desktop" | "tablet" | "mobile" = "desktop") => renderToStaticMarkup(<TextElementRenderer element={element} viewport={viewport} templateKey="modern-editorial-v1" library={library} context={{ headingFontId: "inter", bodyFontId: "inter", headingColorId: "body", bodyColorId: "body", accentColorId: "body" }} />);

describe("TextElementRenderer", () => {
  it.each(TEXT_SIZES)("renders canonical %s with its unchanged CSS mapping", (fontSize) => {
    expect(render({ ...base, appearance: { fontSize } })).toContain(`font-size:${elementFontSizes[fontSize]}`);
  });

  it("renders the canonical document and inline marks", () => {
    const html = render(base);
    expect(html).toContain('data-website-element="text"');
    expect(html).toContain("<strong");
    expect(html).toContain("Hello ");
    expect(html).toContain("world");
  });

  it("preserves typography controls and responsive overrides", () => {
    const element: TextElement = { ...base, appearance: { fontWeight: 700, italic: true, underline: true, strikethrough: true, textTransform: "uppercase", colorId: "body", fontSize: "l", alignment: "center", responsive: { tablet: { fontSize: "xl" }, mobile: { alignment: "end" } } } };
    const mobile = render(element, "mobile");
    expect(mobile).toContain("font-size:1.5rem");
    expect(mobile).toContain("text-align:end");
    expect(mobile).toContain("font-style:italic");
    expect(mobile).toContain("text-decoration-line:underline line-through");
    expect(mobile).toContain("text-transform:uppercase");
    expect(mobile).toContain("color:#112233");
  });

  it("renders the document editor with the canonical callback", () => {
    const html = renderToStaticMarkup(<TextElementRenderer element={base} editor={{ onDocumentChange: () => undefined, onAddColor: async () => ({ id: "project-color-00000000000000000000000000", value: "#000000" }) }} viewport="desktop" templateKey="modern-editorial-v1" library={library} />);
    expect(html).toContain('contentEditable="true"');
    expect(html).toContain('aria-label="Text content"');
  });

  it("keeps inline color above block color and exposes no persisted identity publicly", () => {
    const document = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Neil " }, { text: "&", colorId: "green" }, { text: " Hazel" }] }] };
    const black = render({ ...base, document, appearance: { colorId: "body" } });
    const blue = render({ ...base, document, appearance: { colorId: "blue" } });
    expect(black).toContain("color:#112233");
    expect(black).toContain('<span style="color:#008000">&amp;</span>');
    expect(blue).toContain("color:#0000FF");
    expect(blue).toContain('<span style="color:#008000">&amp;</span>');
    expect(blue).not.toContain("green");
    expect(blue).not.toContain("colorId");
    expect(blue).not.toContain("editorName");
  });

  it("composes large display type and both block effects without changing canonical runs or geometry styles", () => {
    const document = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Neil ", marks: { bold: true, italic: true, underline: true, strikethrough: true } }, { text: "&", colorId: "green" }, { text: " Hazel" }] }] };
    const html = render({ ...base, document, appearance: { fontSize: "5xl", textShadow: "medium", textShadowColorId: "body", glow: "strong", glowColorId: "blue" } });
    expect(html).toContain("font-size:6rem");
    expect(html).toContain("text-shadow:0 2px 4px #112233, 0 1px 2px #112233, 0 0 5px #0000FF, 0 0 10px #0000FF, 0 0 18px #0000FF");
    expect(html).toContain('<span style="color:#008000">&amp;</span>');
    expect(html).toContain("width:100%");
    expect(html).toContain("p-0");
    expect(html).not.toContain("textShadowColorId");
  });
});
