import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { textDocumentSchema } from "./schemas";
import { applyTextInlineColor, canonicalizeTextDocument, textDocumentFromPasteElement, textDocumentToHtml } from "./textDocument";
import { TextElementRenderer } from "../websiteRenderer/TextElementRenderer";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";

const library = { colors: [], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] } as unknown as TemplateDesignLibrary;
const textDocument = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "First", marks: { bold: true, italic: true, underline: true, strikethrough: true } }] }, { type: "paragraph" as const, children: [{ text: "Second" }] }] };
type ForeignNode = { nodeType: number; textContent?: string; tagName?: string; childNodes: ForeignNode[]; children: ForeignNode[]; querySelectorAll(): ForeignNode[] };
const text = (textContent: string): ForeignNode => ({ nodeType: 3, textContent, childNodes: [], children: [], querySelectorAll: () => [] });
const element = (tagName: string, childNodes: ForeignNode[]): ForeignNode => ({ nodeType: 1, tagName: tagName.toUpperCase(), childNodes, children: childNodes.filter((node) => node.nodeType === 1), querySelectorAll: () => [] });

describe("Text canonical document", () => {
  it("splits only the selected symbol and merges back after reset", () => {
    const source = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Neil & Hazel" }] }] };
    const colored = applyTextInlineColor(source, { paragraph: 0, offset: 5 }, { paragraph: 0, offset: 6 }, "green");
    expect(colored.children[0].children).toEqual([{ text: "Neil " }, { text: "&", colorId: "green" }, { text: " Hazel" }]);
    expect(applyTextInlineColor(colored, { paragraph: 0, offset: 5 }, { paragraph: 0, offset: 6 })).toEqual(source);
  });

  it.each([
    ["partial word", 1, 4],
    ["whole word", 0, 4],
    ["multiple words", 0, 9],
  ])("colors a %s selection", (_label, start, end) => {
    const source = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "word pair" }] }] };
    const colored = applyTextInlineColor(source, { paragraph: 0, offset: start }, { paragraph: 0, offset: end }, "green");
    expect(colored.children[0].children.filter(({ colorId }) => colorId === "green").map(({ text }) => text).join("")).toBe([..."word pair"].slice(start, end).join(""));
  });

  it("recolors across marked runs without losing marks or stacking colors", () => {
    const source = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [
      { text: "A", marks: { bold: true }, colorId: "red" },
      { text: "B", marks: { italic: true, underline: true, strikethrough: true } },
    ] }] };
    const colored = applyTextInlineColor(source, { paragraph: 0, offset: 0 }, { paragraph: 0, offset: 2 }, "green");
    expect(colored.children[0].children).toEqual([
      { text: "A", marks: { bold: true }, colorId: "green" },
      { text: "B", marks: { italic: true, underline: true, strikethrough: true }, colorId: "green" },
    ]);
    expect(canonicalizeTextDocument({ ...colored, children: [{ type: "paragraph", children: [{ text: "", colorId: "green" }, ...colored.children[0].children] }] }).children[0].children).not.toContainEqual(expect.objectContaining({ text: "" }));
  });

  it("strictly validates inline color identity", () => {
    const withRun = (run: object) => ({ type: "doc", children: [{ type: "paragraph", children: [run] }] });
    expect(textDocumentSchema.safeParse(withRun({ text: "&", colorId: "green" })).success).toBe(true);
    expect(textDocumentSchema.safeParse(withRun({ text: "&", colorId: "" })).success).toBe(false);
    expect(textDocumentSchema.safeParse(withRun({ text: "&", color: "#00ff00" })).success).toBe(false);
    expect(textDocumentSchema.safeParse(withRun({ text: "&", style: { color: "green" } })).success).toBe(false);
  });

  it("allows only paragraphs and emphasis marks", () => {
    expect(textDocumentSchema.safeParse(textDocument).success).toBe(true);
    expect(textDocumentSchema.safeParse({ type: "doc", children: [{ type: "bulletList", items: [[{ text: "No" }]] }] }).success).toBe(false);
    expect(textDocumentSchema.safeParse({ type: "doc", children: [{ type: "paragraph", children: [{ text: "No", marks: { link: "https://example.com" } }] }] }).success).toBe(false);
  });

  it("normalizes pasted lists and links into paragraph text while retaining emphasis", () => {
    const root = element("div", [element("ul", [element("li", [element("strong", [text("One")])]), element("li", [element("a", [element("em", [text("Two")])])])])]);
    expect(textDocumentFromPasteElement(root as unknown as HTMLElement)).toEqual({ type: "doc", children: [{ type: "paragraph", children: [{ text: "One", marks: { bold: true } }] }, { type: "paragraph", children: [{ text: "Two", marks: { italic: true } }] }] });
  });

  it("serializes and renders only paragraphs and supported inline emphasis", () => {
    expect(textDocumentToHtml(textDocument)).toBe('<p><s><u><em><strong>First</strong></em></u></s></p><p>Second</p>');
    const html = renderToStaticMarkup(<TextElementRenderer element={{ id: "rich-1", type: "text", editorName: "Text 1", document: textDocument }} viewport="desktop" templateKey="modern-editorial-v1" library={library} />);
    expect(html).toContain("<strong");
    expect(html).not.toMatch(/<(?:ul|ol|li|a)(?:\s|>)/);
  });

  it("owns a visible one-and-a-half-em gap only between three public paragraphs", () => {
    const document = { type: "doc" as const, children: ["First", "Second", "Third"].map((text) => ({ type: "paragraph" as const, children: [{ text }] })) };
    const html = renderToStaticMarkup(<TextElementRenderer element={{ id: "rich-1", type: "text", editorName: "Text 1", document }} viewport="desktop" templateKey="modern-editorial-v1" library={library} />);
    expect(html).toContain("[&amp;&gt;p+p]:mt-[1.5em]");
    expect(html).toContain('<p class="m-0 whitespace-pre-wrap">First</p><p class="m-0 whitespace-pre-wrap">Second</p><p class="m-0 whitespace-pre-wrap">Third</p>');
    expect(html).not.toContain("space-y-");
  });

  it("uses the same internal paragraph rhythm in the editor without outer paragraph margins", async () => {
    const { TextCanvasEditor } = await import("../websiteEditor/components/TextCanvasEditor");
    const html = renderToStaticMarkup(<TextCanvasEditor library={library} projectColors={[]} onAddColor={async () => ({ id: "project-color-00000000000000000000000000", value: "#000000" })} element={{ id: "rich-1", type: "text", editorName: "Text 1", document: textDocument }} viewport="desktop" onDocumentChange={() => undefined} />);
    expect(html).toContain("[&amp;&gt;*]:m-0");
    expect(html).toContain("[&amp;&gt;p+p]:mt-[1.5em]");
    expect(html).not.toContain("space-y-");
  });

  it("shows an editor-only placeholder for an empty Text document", async () => {
    const { TextCanvasEditor } = await import("../websiteEditor/components/TextCanvasEditor");
    const emptyDocument = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "" }] }] };
    const element = { id: "rich-empty", type: "text" as const, editorName: "Text 1", document: emptyDocument };

    const editorHtml = renderToStaticMarkup(<TextCanvasEditor library={library} projectColors={[]} onAddColor={async () => ({ id: "project-color-00000000000000000000000000", value: "#000000" })} element={element} viewport="desktop" onDocumentChange={() => undefined} />);
    const publicHtml = renderToStaticMarkup(<TextElementRenderer element={element} viewport="desktop" templateKey="modern-editorial-v1" library={library} />);

    expect(editorHtml).toContain("Add text");
    expect(editorHtml).toContain("inline-edit-placeholder");
    expect(publicHtml).not.toContain("Add text");
  });

  it("keeps a trailing empty paragraph from creating external bottom space", () => {
    const document = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Visible" }] }, { type: "paragraph" as const, children: [{ text: "" }] }] };
    expect(textDocumentToHtml(document)).toBe('<p>Visible</p><p data-text-empty-paragraph></p>');
    const publicHtml = renderToStaticMarkup(<TextElementRenderer element={{ id: "rich-1", type: "text", editorName: "Text 1", document }} viewport="desktop" templateKey="modern-editorial-v1" library={library} />);
    expect(publicHtml).toContain("m-0 min-h-0");
    expect(publicHtml).toContain("p[data-text-empty-paragraph]]:!mt-0");
    expect(publicHtml).toContain('data-text-empty-paragraph="true"');
  });
});





