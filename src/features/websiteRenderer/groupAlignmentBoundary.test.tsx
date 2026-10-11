import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GroupElementRenderer } from "./GroupElementRenderer";
import { SectionChildFlowRenderer } from "./SectionChildFlowRenderer";
import { resetElementInlineAlignment, resolveElementInlineAlignment } from "./elementInlineAlignment";
import type { CompositionGroup, DividerElement } from "../websiteElements/types";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";

const property = "--website-element-inline-justify";
const alignments = ["start", "center", "end", "stretch"] as const;
const leafAlignments = ["start", "center", "end"] as const;
const justify = { start: "flex-start", center: "center", end: "flex-end" };
const percentages = { small: 25, medium: 50, large: 75, full: 100 } as const;
const widths = ["small", "medium", "large", "full"] as const;
const props = { sectionId: "date", templateKey: "classic-filipiniana-v1", library: { colors: [] } as unknown as TemplateDesignLibrary, projectColors: [] };
const divider = (width: typeof widths[number], alignment: typeof leafAlignments[number]): DividerElement => ({ id: "divider", type: "divider", editorName: "Divider 1", appearance: { width, alignment } });
const group = <T extends CompositionGroup["children"]>(id: string, alignment: typeof alignments[number], children: T) => ({ id, type: "compositionGroup", editorName: id, layout: { direction: "vertical", alignment, gap: "m" }, children } satisfies CompositionGroup);

function assertArtwork(html: string, width: typeof widths[number], alignment: typeof leafAlignments[number]) {
  expect(html).toContain(`justify-content:var(${property}, ${justify[alignment]})`);
  expect(html).toContain(`width:${percentages[width]}%;aspect-ratio:2116 / 328`);
  const visual = html.match(/data-website-element="divider"[^>]*><span[^>]*>/)?.[0];
  expect(visual).toBeDefined();
  expect(visual).not.toMatch(/margin|padding|min-height|overflow|object-fit|height:/);
  expect(html).not.toMatch(/100vw|w-screen|width:fit-content|overflow:hidden|margin-left:-|margin-right:-/);
}

describe("nearest Group inline alignment boundary", () => {
  it("clears inheritance with initial, allowing every participating leaf's fallback", () => {
    expect(resetElementInlineAlignment()).toEqual({ [property]: "initial" });
    expect(resolveElementInlineAlignment("flex-end")).toBe(`var(${property}, flex-end)`);
  });

  describe.each(["editor", "public"] as const)("%s geometry", (mode) => {
    it.each(widths)("keeps Section-root %s placement intrinsic to Divider", (width) => {
      for (const alignment of leafAlignments) {
        const element = divider(width, alignment);
        const html = renderToStaticMarkup(<SectionChildFlowRenderer {...props} mode={mode} viewport="desktop" specialized={null} flow={{ elements: [element], order: [{ kind: "element", id: element.id }] }} />);
        assertArtwork(html, width, alignment);
        expect(html).not.toContain(`${property}:`);
      }
    });

    it.each(widths)("bounds %s in all immediate and nested Vertical alignments", (width) => {
      for (const viewport of ["desktop", "tablet", "mobile"] as const) {
        for (const outer of alignments) for (const alignment of leafAlignments) {
          const element = divider(width, alignment);
          const immediate = renderToStaticMarkup(<GroupElementRenderer {...props} mode={mode} viewport={viewport} group={group("outer", outer, [element])} />);
          assertArtwork(immediate, width, alignment);
          expect(immediate).toContain(`${property}:initial`);
          if (outer !== "stretch") expect(immediate).toContain(`${property}:${justify[outer]}`);
          for (const inner of alignments) {
            const html = renderToStaticMarkup(<GroupElementRenderer {...props} mode={mode} viewport={viewport} group={group("outer", outer, [group("inner", inner, [element])])} />);
            assertArtwork(html, width, alignment);
            const roots = [...html.matchAll(/data-website-element="group"[^>]*style="([^"]+)"/g)];
            expect(roots).toHaveLength(2);
            for (const root of roots) expect(root[1]).toContain(`${property}:initial`);
            // Inspect only the nearest Group subtree: outer overrides must end at its root.
            const innerHtml = html.slice(roots[1].index);
            const declarations = [...innerHtml.matchAll(/--website-element-inline-justify:([^;"&]+)/g)].map((match) => match[1]);
            expect(declarations).toEqual(inner === "stretch" ? ["initial"] : ["initial", justify[inner]]);
            expect(innerHtml).toContain("width:100%;min-width:0;max-width:100%");
            expect(innerHtml).toContain("width:100%;max-width:100%;flex:0 1 auto");
            expect(innerHtml).toContain("gap:1rem");
          }
        }
      }
    });

    it.each(widths)("bounds %s in nested Horizontal cells without inherited inline alignment", (width) => {
      const presets = { "50-50": "repeat(2,minmax(0,1fr))", "60-40": "minmax(0,3fr) minmax(0,2fr)", "40-60": "minmax(0,2fr) minmax(0,3fr)", thirds: "repeat(3,minmax(0,1fr))" } as const;
      for (const [division, tracks] of Object.entries(presets)) for (const outer of alignments) for (const alignment of leafAlignments) {
        const element = divider(width, alignment);
        const inner = { ...group("inner", "stretch", [element, { ...element, id: "second" }, ...(division === "thirds" ? [{ ...element, id: "third" }] : [])]), layout: { direction: "horizontal", division: division as keyof typeof presets, gap: "m" } } satisfies CompositionGroup;
        const html = renderToStaticMarkup(<GroupElementRenderer {...props} mode={mode} viewport="desktop" group={group("outer", outer, [inner])} />);
        assertArtwork(html, width, alignment);
        const innerHtml = html.slice(html.indexOf('data-website-element="group"', html.indexOf('data-website-element="group"') + 1));
        expect(innerHtml).toContain(`${property}:initial`);
        expect(innerHtml).not.toMatch(/--website-element-inline-justify:(flex-start|center|flex-end)/);
        expect(innerHtml).toContain(`grid-template-columns:${tracks}`);
        expect(innerHtml).toContain("min-w-0 max-w-full");
      }
    });
  });
});
