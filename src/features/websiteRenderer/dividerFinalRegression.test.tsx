import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import fixtures from "../websiteElements/fixtures/divider-contract.json";
import { dividerElementSchema, textElementSchema } from "../websiteElements/schemas";
import { duplicateWebsiteElement, findSectionElement, moveSectionElement, renameSectionElement, setSectionElementHidden, type SectionChildFlow } from "../websiteEditor/sectionChildFlow";
import { SectionChildFlowRenderer } from "./SectionChildFlowRenderer";
import { SectionChildList } from "../websiteEditor/components/SectionChildList";
import { DividerElementRenderer } from "./DividerElementRenderer";
import { WebsiteElementFrame } from "./WebsiteElementFrame";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";

const element = dividerElementSchema.parse(fixtures.roundTripCases[1].element);
const library = { colors: [{ id: "terracotta-text", value: "#123456" }] } as unknown as TemplateDesignLibrary;
const props = { sectionId: "date", templateKey: "classic-filipiniana-v1", viewport: "desktop" as const, library, projectColors: [{ id: "project-color-01KED9H9XR7WQBP4JTKP1YYQ3F", value: "#ABCDEF" }] };
const flow = (): SectionChildFlow => ({ elements: [element, { id: "group", type: "compositionGroup", editorName: "Group 1", children: [{ id: "inner", type: "compositionGroup", editorName: "Group 2", children: [] }] }], order: [{ kind: "specialized", key: "content" }, { kind: "element", id: element.id }, { kind: "element", id: "group" }] });

describe("Divider final identity and visibility regressions", () => {
  it("renames only editorName", () => {
    const renamed = renameSectionElement(flow(), element.id, "Wedding ornament");
    expect(findSectionElement(renamed, element.id)).toEqual({ ...element, editorName: "Wedding ornament" });
    expect(renamed.order).toEqual(flow().order);
  });

  it("preserves complete state through the shared Move/DnD operation at each depth", () => {
    let current = flow();
    for (const parentId of ["group", "inner", null]) {
      const result = moveSectionElement(current, element.id, { parentId, index: 0 });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Move failed");
      current = result.flow;
      expect(findSectionElement(current, element.id)).toEqual(element);
    }
  });

  it("duplicates with fresh automatic identity and copied visibility/appearance", () => {
    const duplicate = duplicateWebsiteElement(flow(), element);
    expect(duplicate.id).not.toBe(element.id);
    expect(duplicate.editorName).toBe("Divider 8");
    expect(duplicate).toEqual({ ...element, id: duplicate.id, editorName: "Divider 8" });
    expect(duplicate.appearance).not.toBe(element.appearance);
  });

  it.each([null, "group", "inner"])("hides without losing Structure identity at %s", (parentId) => {
    let current = flow();
    if (parentId) {
      const moved = moveSectionElement(current, element.id, { parentId, index: 0 });
      if (!moved.ok) throw new Error("Move failed");
      current = moved.flow;
    }
    const hidden = setSectionElementHidden(current, element.id, true);
    expect(findSectionElement(hidden, element.id)).toEqual({ ...element, isHidden: true });
    for (const mode of ["editor", "public"] as const) {
      const html = renderToStaticMarkup(<SectionChildFlowRenderer {...props} flow={hidden} specialized={null} mode={mode} />);
      expect(html).not.toContain(`data-section-child-element="${element.id}"`);
      expect(html).not.toContain('data-website-element="divider"');
    }
    const shown = setSectionElementHidden(hidden, element.id, false);
    const { isHidden: _visibility, ...visible } = element;
    void _visibility;
    expect(findSectionElement(shown, element.id)).toEqual(visible);
  });

  it("keeps hidden Divider visible and named in Structure", () => {
    const hidden = setSectionElementHidden(flow(), element.id, true);
    const html = renderToStaticMarkup(<SectionChildList sectionLabel="Date" flow={hidden} selected={null} onSelect={vi.fn()} onChange={vi.fn()} onRenameSave={vi.fn(async () => null)} onDuplicate={vi.fn()} onDelete={vi.fn()} />);
    expect(html).toContain(`Divider block: ${element.editorName}, hidden`);
    expect(html).toContain('data-element-hidden="true"');
  });

  it("preserves empty appearance under the existing generic convention", () => {
    expect(dividerElementSchema.parse({ ...element, appearance: {} }).appearance).toEqual({});
    expect(textElementSchema.parse({ id: "text", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "" }] }] }, appearance: {} }).appearance).toEqual({});
  });
});

describe("decorative semantics and renderer parity", () => {
  it.each(fixtures.roundTripCases)("preserves visual output for $name", ({ element: candidate }) => {
    const divider = dividerElementSchema.parse(candidate);
    const visual = (mode: "editor" | "public") => renderToStaticMarkup(<DividerElementRenderer {...props} mode={mode} element={divider} />);
    expect(visual("editor")).toBe(visual("public"));
    expect(visual("public")).toMatch(/data-website-element="divider"[^>]*aria-hidden="true"/);
    expect(visual("public")).not.toMatch(/role="separator"|<hr|aria-label=/);
    expect(visual("public")).not.toContain(divider.editorName);
    const editor = renderToStaticMarkup(<WebsiteElementFrame mode="editor" sectionId="date" elementId={divider.id} elementType="divider" selected={true}><DividerElementRenderer {...props} mode="editor" element={divider} /></WebsiteElementFrame>);
    const frame = editor.match(/^<div[^>]*>/)![0];
    expect(frame).not.toContain("aria-hidden");
    expect(editor).toContain('aria-label="Select Divider"');
    expect(editor.match(/<button[^>]*aria-label="Select Divider"[^>]*>/)![0]).not.toContain("aria-hidden");
  });

  it("does not create public wrappers for unavailable artwork", () => {
    const unavailable = { ...element, isHidden: false, appearance: { ...element.appearance, assetId: "missing" } };
    const children: SectionChildFlow = { elements: [unavailable], order: [{ kind: "element", id: unavailable.id }] };
    const publicHtml = renderToStaticMarkup(<SectionChildFlowRenderer {...props} flow={children} specialized={null} mode="public" />);
    expect(publicHtml).not.toContain("data-section-child-element");
    expect(publicHtml).not.toContain('data-website-element="divider"');
    const editor = renderToStaticMarkup(<SectionChildFlowRenderer {...props} flow={children} specialized={null} mode="editor" />);
    expect(editor).toContain("data-divider-unavailable");
  });
});
