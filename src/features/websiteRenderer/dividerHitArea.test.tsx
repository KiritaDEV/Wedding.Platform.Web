import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { nearestEditorHitFrame } from "./editorHitTarget";
import { WebsiteElementFrame } from "./WebsiteElementFrame";
import { GroupElementRenderer } from "./GroupElementRenderer";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";

const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8");

function frame(top: number, bottom: number): HTMLElement {
  const result = { getBoundingClientRect: () => ({ top, bottom, left: 0, right: 80 }), contains: () => false, closest: () => result };
  return result as unknown as HTMLElement;
}

describe("Divider editor hit area", () => {
  it("is absolute, vertically bounded, and never expands horizontal or flow geometry", () => {
    const hit = css.match(/\.editor-divider-hit-area\s*\{([^}]+)\}/)![1];
    expect(hit).toContain("position: absolute");
    expect(hit).toContain("inset-inline: 0");
    expect(hit).toContain("top: -6px");
    expect(hit).toContain("bottom: -6px");
    expect(hit).not.toMatch(/min-height|padding|margin|width:/);
    expect(css).not.toMatch(/\.editor-divider-hit-area:(hover|active)/);
    for (const selector of ["editor-selection-frame", "editor-element-badge"]) expect(css.match(new RegExp(`\\.${selector}\\s*\\{([^}]+)\\}`))![1]).toContain("position: absolute");
  });

  it.each([false, true])("adds only editor chrome with selected=%s", (selected) => {
    const props = { sectionId: "date", elementId: "divider", elementType: "divider", selected, children: <span data-artwork /> };
    const editor = renderToStaticMarkup(<WebsiteElementFrame {...props} mode="editor" />);
    const publicHtml = renderToStaticMarkup(<WebsiteElementFrame {...props} mode="public" />);
    expect(editor).toContain("data-editor-divider-hit-area");
    expect(editor).not.toMatch(/min-height|padding|margin|height:/);
    expect(publicHtml).not.toContain("editor-");
    expect(publicHtml).toContain("data-artwork");
  });

  it.each(["small", "medium", "large", "full"] as const)("preserves %s artwork in narrow zero-gap cells across selection and mode", (width) => {
    const percentages = { small: 25, medium: 50, large: 75, full: 100 };
    for (const division of ["50-50", "60-40", "40-60", "thirds"] as const) {
      const child = { id: "divider", type: "divider" as const, editorName: "Divider 1", appearance: { width } };
      const group = { id: "group", type: "compositionGroup" as const, editorName: "Group 1", children: [child, { ...child, id: "second" }, ...(division === "thirds" ? [{ ...child, id: "third" }] : [])], layout: { direction: "horizontal" as const, division, width: "narrow" as const, gap: "none" as const } };
      const render = (mode: "editor" | "public", selectedElementId: string | null) => renderToStaticMarkup(<GroupElementRenderer group={group} mode={mode} selectedElementId={selectedElementId} sectionId="date" viewport="desktop" templateKey="classic-filipiniana-v1" library={{ colors: [] } as unknown as TemplateDesignLibrary} projectColors={[]} />);
      const results = [render("public", null), render("editor", null), render("editor", "divider")];
      for (const html of results) {
        expect(html).toContain("gap:0");
        expect(html).toContain("minmax(0,");
        expect(html).toContain(`width:${percentages[width]}%;aspect-ratio:2116 / 328`);
      }
      const artwork = (html: string) => [...html.matchAll(/data-website-element="divider"[^>]*><span[^>]*style="([^"]+)"/g)].map((match) => match[1]);
      expect(artwork(results[1])).toEqual(artwork(results[0]));
      expect(artwork(results[2])).toEqual(artwork(results[0]));
    }
  });

  it.each(["Text", "Text", "Media", "Divider"])("prefers actual adjacent %s bounds at zero gap", () => {
    const divider = frame(20, 23);
    const above = frame(0, 20);
    const below = frame(23, 26);
    const parent = frame(0, 100);
    parent.contains = (other) => other !== parent;
    const hits = [divider, parent, above, below];
    expect(nearestEditorHitFrame(divider, hits, 40, 19)).toBe(above);
    expect(nearestEditorHitFrame(divider, hits, 40, 21)).toBe(divider);
    expect(nearestEditorHitFrame(divider, hits, 40, 24)).toBe(below);
  });

  it("chooses the nearest thin Divider where hit strips overlap in a gap", () => {
    const first = frame(0, 2);
    const second = frame(6, 8);
    expect(nearestEditorHitFrame(second, [first, second], 40, 3)).toBe(first);
    expect(nearestEditorHitFrame(first, [first, second], 40, 5)).toBe(second);
  });
});
