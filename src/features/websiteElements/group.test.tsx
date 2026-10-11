import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { addGroupChild, createGroupElement, findSectionElement, ungroupSectionElement, updateGroupChildren, updateSectionTextDocument, type SectionChildFlow } from "../websiteEditor/sectionChildFlow";
import { GroupElementRenderer } from "../websiteRenderer/GroupElementRenderer";
import { WebsiteElementFrame } from "../websiteRenderer/WebsiteElementFrame";
import { resolveGroupLayout, selectGroupLayoutProperty, selectGroupPaddingSide, setGroupLayoutProperty } from "./group";
import { compositionGroupSchema } from "./schemas";
import type { CompositionGroup } from "./types";

const library = { colors: [], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] } as never;
const childJustification = { start: "flex-start", center: "center", end: "flex-end" } as const;
const group: CompositionGroup = { id: "group", type: "compositionGroup", editorName: "Group 1", children: [{ id: "a", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "First"  }] }] }}, { id: "b", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Second"  }] }] }}], layout: { width: "narrow", direction: "horizontal", gap: "l", padding: { top: "s" }, alignment: "center", division: "40-60", responsive: { mobile: { direction: "vertical", gap: "s" } } } };

describe("Group", () => {
  it("renders a clipped decorative background layer without clipping or resizing foreground content", () => {
    const candidate: CompositionGroup = { ...group, backgroundMedia: { assetId: "01M00000000000000000000000", focalPoint: { x: 0.2, y: 0.8 }, zoom: 1.7 }, appearance: { backgroundColorId: "surface", backgroundImageOpacity: 45 }, layout: { direction: "horizontal", division: "60-40", gap: "l", padding: { top: "m" } }, children: [{ id: "large-text", type: "text", editorName: "Text 1", document: { type: "doc", children: [{ type: "paragraph", children: [{ text: "Large" }] }] }, appearance: { fontSize: "5xl", textShadow: "soft", glow: "medium" } }, group.children[1]] };
    const media = { "01M00000000000000000000000": { id: "01M00000000000000000000000", originalFilename: "group.jpg", width: 1200, height: 800, web: { url: "/group.jpg", width: 1200, height: 800 } } };
    const html = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="hero" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} media={media} />);
    expect(html).toContain('data-group-background-image="true"');
    expect(html).toContain('class="pointer-events-none absolute inset-0 overflow-hidden" style="opacity:0.45"');
    expect(html).toContain('data-media-focal-x="0.2" data-media-focal-y="0.8" data-media-zoom="1.7"');
    expect(html).toContain("grid-template-columns:minmax(0,3fr) minmax(0,2fr)");
    expect(html).toContain("gap:1.5rem");
    expect(html).toContain("padding-top:1rem");
    expect(html).toContain("font-size:6rem");
    expect(html).toContain("text-shadow:");
    expect(html).not.toMatch(/data-website-element="group"[^>]*overflow-hidden/);
    expect(html).not.toContain("min-height");
  });
  it.each(["50-50", "40-60", "60-40", "thirds"] as const)("removes unresolved Media before %s orphan geometry", (division) => {
    const candidate: CompositionGroup = {
      id: `group-${division}`, type: "compositionGroup", editorName: "Group 1",
      children: [
        { id: "text", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Remaining"  }] }] }},
        { id: "missing", type: "media", editorName: "Media 1", items: [{ id: "image", type: "image", mediaId: "01J00000000000000000000000", alt: "Missing" }] },
      ],
      layout: { direction: "horizontal", division, gap: "l" },
    };
    const html = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} media={{}} />);
    expect(html).toContain("Remaining");
    expect(html).not.toContain('data-section-child-element="missing"');
    expect(html).not.toContain("grid-column:1 / -1");
    expect(html.match(/data-section-generic-child/g)).toHaveLength(1);
  });

  it("filters Media renderability recursively before nested Group slots are created", () => {
    const candidate: CompositionGroup = {
      id: "outer", type: "compositionGroup", editorName: "Group 1",
      children: [
        { id: "nested", type: "compositionGroup", editorName: "Group 2", children: [{ id: "empty", type: "media", editorName: "Media 1", items: [] }] },
        { id: "text", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Only public child"  }] }] }},
      ],
      layout: { direction: "vertical", gap: "l" },
    };
    const published = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} media={{}} />);
    expect(published).toContain("Only public child");
    expect(published).not.toContain('data-section-child-element="nested"');
    const editor = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="editor" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} media={{}} />);
    expect(editor).toContain('data-section-child-element="nested"');
    expect(editor).toContain("data-media-empty");
  });

  it("validates the focused layout contract and rejects the retired placeholder", () => {
    expect(compositionGroupSchema.safeParse(group).success).toBe(true);
    expect(compositionGroupSchema.safeParse({ id: "old", type: "compositionGroup", editorName: "Group 1", composition: "flow", children: [] }).success).toBe(false);
    expect(compositionGroupSchema.safeParse({ id: "unsupported", type: "compositionGroup", editorName: "Group 1", children: [{ id: "heading", type: "heading", text: "No" }] }).success).toBe(false);
  });

  it("validates Group background appearance", () => {
    expect(compositionGroupSchema.safeParse({ ...group, appearance: { backgroundColorId: "sage-accent", shadow: "medium", decorativeAppearance: { background: { texture: "paper", textureStrength: 40, pattern: "botanical", patternStrength: 60 } } } }).success).toBe(true);
    expect(compositionGroupSchema.safeParse({ ...group, appearance: { decorativeAppearance: { background: { texture: "invalid" } } } }).success).toBe(false);
  });

  it("renders the same shadow scale used by Media blocks", () => {
    const shadowed: CompositionGroup = { ...group, appearance: { shadow: "strong" } };
    const html = renderToStaticMarkup(<GroupElementRenderer group={shadowed} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);

    expect(html).toContain("box-shadow:0 18px 45px rgb(0 0 0 / .24)");
  });

  it("renders responsive composition without decoration or external margin", () => {
    const desktop = renderToStaticMarkup(<GroupElementRenderer group={group} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    const mobile = renderToStaticMarkup(<GroupElementRenderer group={group} sectionId="date" mode="public" viewport="mobile" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(desktop).toContain("grid-template-columns:minmax(0,2fr) minmax(0,3fr)");
    expect(desktop).toContain("gap:1.5rem");
    expect(desktop).toContain("max-width:32rem");
    expect(mobile).toContain("flex-direction:column");
    expect(mobile).toContain("gap:0.5rem");
    expect(desktop).not.toMatch(/background|border-radius|box-shadow/);
  });

  it("resolves each viewport from base plus only its own sparse override", () => {
    const layout = { width: "wide", direction: "horizontal", gap: "l", padding: { top: "xl" }, alignment: "center", division: "40-60", responsive: { tablet: { width: "medium", gap: "m", alignment: "end", division: "thirds" }, mobile: { width: "full", direction: "vertical", gap: "s", padding: { top: "xs" } } } } as const;
    expect(resolveGroupLayout(layout, "desktop")).toMatchObject({ width: "wide", direction: "horizontal", gap: "l", alignment: "center", division: "40-60" });
    expect(resolveGroupLayout(layout, "tablet")).toMatchObject({ width: "medium", direction: "horizontal", gap: "m", alignment: "end", division: "thirds" });
    expect(resolveGroupLayout(layout, "mobile")).toMatchObject({ width: "full", direction: "vertical", gap: "s", alignment: "center", division: "40-60", padding: { top: "xs" } });
  });

  it("does not force or inherit a Tablet direction on Mobile", () => {
    const layout = { direction: "horizontal", responsive: { tablet: { direction: "vertical", gap: "xl" }, mobile: { gap: "xs" } } } as const;
    expect(resolveGroupLayout(layout, "tablet")).toMatchObject({ direction: "vertical", gap: "xl" });
    expect(resolveGroupLayout(layout, "mobile")).toMatchObject({ direction: "horizontal", gap: "xs" });
  });

  it("stores sparse overrides and reset reveals base", () => {
    const base = { direction: "horizontal", gap: "l" } as const;
    const overridden = setGroupLayoutProperty(base, "mobile", "direction", "vertical");
    expect(overridden.responsive?.mobile).toEqual({ direction: "vertical" });
    const reset = setGroupLayoutProperty(overridden, "mobile", "direction", undefined);
    expect(reset).toEqual(base);
    expect(resolveGroupLayout(reset, "mobile").direction).toBe("horizontal");
  });

  it.each(["desktop", "tablet", "mobile"] as const)("persists explicit %s gap none distinctly from reset", (viewport) => {
    const base = { gap: "l" } as const;
    const explicitNone = setGroupLayoutProperty(base, viewport, "gap", "none");
    if (viewport === "desktop") expect(explicitNone.gap).toBe("none");
    else expect(explicitNone.responsive?.[viewport]?.gap).toBe("none");
    expect(resolveGroupLayout(explicitNone, viewport).gap).toBe("none");

    const reset = setGroupLayoutProperty(explicitNone, viewport, "gap", undefined);
    expect(resolveGroupLayout(reset, viewport).gap).toBe(viewport === "desktop" ? undefined : "l");
    if (viewport !== "desktop") expect(reset.responsive?.[viewport]).toBeUndefined();
  });

  it("keeps stretch as the persisted alignment and renders fill behavior", () => {
    const stretched: CompositionGroup = { ...group, layout: { direction: "vertical", alignment: "stretch" } };
    expect(compositionGroupSchema.parse(stretched).layout?.alignment).toBe("stretch");
    const html = renderToStaticMarkup(<GroupElementRenderer group={stretched} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(html).toContain("align-items:stretch");
  });

  it.each(["desktop", "tablet", "mobile"] as const)("keeps Vertical Group children bounded under every alignment on %s", (viewport) => {
    const children: CompositionGroup["children"] = [
      { id: "rich", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "A long wrapping Text value that must remain inside the Group bounds." }] }] } },
      { id: "media", type: "media", editorName: "Media 1", items: [{ id: "video", type: "video", url: "https://example.com/video.mp4" }] },
      { id: "divider", type: "divider", editorName: "Divider 1", appearance: { width: "medium" } },
    ];

    for (const alignment of ["start", "center", "end", "stretch"] as const) {
      const candidate: CompositionGroup = { id: `vertical-${viewport}-${alignment}`, type: "compositionGroup", editorName: "Group 1", children, layout: { direction: "vertical", alignment } };
      const html = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="editor" viewport={viewport} templateKey="modern-editorial-v1" library={library} projectColors={[]} />);

      expect(html).toContain("align-items:stretch");
      expect(html.match(/data-group-child-containment/g)).toHaveLength(children.length);
      expect(html.match(new RegExp(`data-group-child-alignment="${alignment}"`, "g"))).toHaveLength(children.length);
      expect(html.match(/display:flex;justify-content:(flex-start|center|flex-end);width:100%;min-width:0;max-width:100%/g)).toHaveLength(children.length);
      expect(html.match(/data-group-rendered-child/g)).toHaveLength(children.length);
      expect(html).toContain("width:100%;max-width:100%;flex:0 1 auto");
      if (alignment === "stretch") expect(html).toContain("--website-element-inline-justify:initial");
      else expect(html).toContain(`--website-element-inline-justify:${childJustification[alignment]}`);
      expect(html).toContain('data-website-element="text"');
      expect(html).toContain('data-media-presentation="single"');
      expect(html).toContain('data-website-element="divider"');
      expect(html).toContain("max-width:100%");
      expect(html).toMatch(/width:(50|[0-9.]+)%/);
      expect(html).not.toMatch(/100vw|w-screen|margin-left:-|margin-right:-|overflow-x:hidden/);
    }
  });

  it("does not add Vertical containment rows to Horizontal Group layout", () => {
    const html = renderToStaticMarkup(<GroupElementRenderer group={group} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(html).not.toContain("data-group-child-containment");
    expect(html).toContain("align-items:center");
    expect(html).toContain("grid-template-columns:minmax(0,2fr) minmax(0,3fr)");
  });

  it("positions constrained rendered-child boxes without changing their authored widths", () => {
    const constrained: CompositionGroup = {
      id: "constrained",
      type: "compositionGroup", editorName: "Group 1",
      children: [
        { id: "media", type: "media", editorName: "Media 1", items: [{ id: "video", type: "video", url: "https://example.com/video.mp4" }], presentation: { width: "small" } },
        { id: "divider", type: "divider", editorName: "Divider 1", appearance: { width: "medium" } },
        { id: "rich", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Bounded copy" }] }] } },
      ],
      layout: { direction: "vertical" },
    };
    const rendered = (["start", "center", "end"] as const).map((alignment) => {
      const html = renderToStaticMarkup(<GroupElementRenderer group={{ ...constrained, layout: { ...constrained.layout, alignment } }} sectionId="date" mode="editor" viewport="desktop" templateKey="classic-filipiniana-v1" library={library} projectColors={[]} />);
      expect(html).toContain(`data-group-child-alignment="${alignment}"`);
      expect(html).toContain(`justify-content:${childJustification[alignment]}`);
      expect(html.match(/width:100%;max-width:100%;flex:0 1 auto/g)).toHaveLength(constrained.children.length);
      expect(html.match(new RegExp(`--website-element-inline-justify:${childJustification[alignment]}`, "g"))).toHaveLength(constrained.children.length);
      expect(html).toContain("max-width:20rem");
      return html;
    });
    const dividerWidth = (html: string) => html.match(/data-website-element="divider"[^>]*><span[^>]*style="width:([^;]+);/)?.[1];
    expect(rendered.map(dividerWidth)).toEqual([dividerWidth(rendered[0]), dividerWidth(rendered[0]), dividerWidth(rendered[0])]);
  });

  it.each(["desktop", "tablet", "mobile"] as const)("keeps Divider width values stable for every Vertical alignment on %s", (viewport) => {
    for (const width of ["small", "medium", "large", "full"] as const) {
      const visualWidths = (["start", "center", "end", "stretch"] as const).map((alignment) => {
        const candidate: CompositionGroup = { id: `divider-${viewport}-${alignment}-${width}`, type: "compositionGroup", editorName: "Group 1", children: [{ id: "divider", type: "divider", editorName: "Divider 1", appearance: { width } }], layout: { direction: "vertical", alignment } };
        const html = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport={viewport} templateKey="classic-filipiniana-v1" library={library} projectColors={[]} />);
        expect(html).toContain("width:100%;min-width:0;max-width:100%");
        expect(html).not.toMatch(/width:fit-content|overflow:hidden|100vw|w-screen/);
        if (alignment === "stretch") expect(html).toContain("--website-element-inline-justify:initial");
        else expect(html).toContain(`--website-element-inline-justify:${childJustification[alignment]}`);
        return html.match(/data-website-element="divider"[^>]*><span[^>]*style="width:([^;]+);/)?.[1];
      });
      expect(visualWidths.every(Boolean)).toBe(true);
      expect(new Set(visualWidths).size).toBe(1);
    }
  });

  it.each(["tablet", "mobile"] as const)("creates and removes sparse %s selections against Desktop", (viewport) => {
    const base = { width: "wide", direction: "horizontal", gap: "l", alignment: "center", division: "40-60" } as const;
    const overridden = selectGroupLayoutProperty(base, viewport, "gap", "none");
    expect(overridden.responsive?.[viewport]?.gap).toBe("none");
    const restored = selectGroupLayoutProperty(overridden, viewport, "gap", "l");
    expect(restored.responsive?.[viewport]).toBeUndefined();
    expect(resolveGroupLayout(restored, viewport).gap).toBe("l");
  });

  it("normalizes each responsive padding side independently", () => {
    const base = { padding: { top: "l", right: "m", bottom: "s", left: "xs" } } as const;
    const topOverride = selectGroupPaddingSide(base, "mobile", "top", "none");
    const twoOverrides = selectGroupPaddingSide(topOverride, "mobile", "right", "xl");
    expect(twoOverrides.responsive?.mobile?.padding).toEqual({ top: "none", right: "xl" });
    const resetTop = selectGroupPaddingSide(twoOverrides, "mobile", "top", "l");
    expect(resetTop.responsive?.mobile?.padding).toEqual({ right: "xl" });
    const resetRight = selectGroupPaddingSide(resetTop, "mobile", "right", "m");
    expect(resetRight.responsive?.mobile).toBeUndefined();
  });

  it("persists explicit responsive None when Desktop spacing is non-None", () => {
    const gap = selectGroupLayoutProperty({ gap: "xl" }, "mobile", "gap", "none");
    const padding = selectGroupPaddingSide({ padding: { left: "l" } }, "mobile", "left", "none");
    expect(gap.responsive?.mobile?.gap).toBe("none");
    expect(padding.responsive?.mobile?.padding?.left).toBe("none");
  });

  it("compares Mobile selections directly with Desktop rather than Tablet", () => {
    const layout = { gap: "m", responsive: { tablet: { gap: "xl" } } } as const;
    expect(selectGroupLayoutProperty(layout, "mobile", "gap", "m").responsive).toEqual({ tablet: { gap: "xl" } });
    expect(selectGroupLayoutProperty(layout, "mobile", "gap", "xl").responsive?.mobile).toEqual({ gap: "xl" });
  });

  it("renders all semantic widths responsively and keeps padding internal", () => {
    for (const [width, maxWidth] of [["full", "100%"], ["wide", "72rem"], ["medium", "48rem"], ["narrow", "32rem"]] as const) {
      const candidate: CompositionGroup = {
        ...group,
        layout: {
          ...group.layout,
          width,
          padding: { top: "xl", right: "l", bottom: "m", left: "s" },
          responsive: { mobile: { width: "full", padding: { top: "xs", right: "none", bottom: "s", left: "none" } } },
        },
      };
      const desktop = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
      const mobile = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport="mobile" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
      expect(desktop).toContain(`max-width:${maxWidth}`);
      expect(desktop).toContain("padding-top:2rem");
      expect(mobile).toContain("max-width:100%");
      expect(mobile).toContain("padding-top:0.25rem");
      expect(mobile).not.toMatch(/margin-top|margin-right|margin-bottom|margin-left/);
    }
  });

  it("uses safe tracks, shrinkable children, and authored DOM order", () => {
    const html = renderToStaticMarkup(<GroupElementRenderer group={{ ...group, children: [...group.children, { id: "c", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Third"  }] }] }}], layout: { direction: "horizontal", division: "thirds", gap: "none" } }} sectionId="date" mode="public" viewport="mobile" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(html).toContain("grid-template-columns:repeat(3,minmax(0,1fr))");
    expect(html).toContain('class="min-w-0 max-w-full [overflow-wrap:anywhere]"');
    expect(html).toMatch(/<div data-website-element="text" class="[^"]*min-w-0 max-w-full[^"]*overflow-wrap:anywhere/);
    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Second"));
    expect(html.indexOf("Second")).toBeLessThan(html.indexOf("Third"));
    expect(html).not.toMatch(/100vw|w-screen|margin-left:-|margin-right:-|position:absolute/);
  });

  it("keeps nested geometry independent and relative to its parent", () => {
    const nested: CompositionGroup = { id: "outer", type: "compositionGroup", editorName: "Group 1", children: [{ id: "inner", type: "compositionGroup", editorName: "Group 1", children: [{ id: "copy", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Nested"  }] }] }}], layout: { width: "narrow", gap: "s", padding: { left: "m" }, responsive: { mobile: { width: "full", gap: "none", padding: { left: "none" } } } } }], layout: { width: "medium", gap: "l", padding: { right: "xl" } } };
    const html = renderToStaticMarkup(<GroupElementRenderer group={nested} sectionId="date" mode="public" viewport="mobile" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(html).toContain("max-width:48rem");
    expect(html).toContain("padding-right:2rem");
    expect(html).toContain("max-width:100%");
    expect(html).toContain("padding-left:0");
    expect(html).toContain("box-sizing:border-box;min-width:0;width:100%");
    expect(html).toMatch(/<div data-website-element="text" class="[^"]*min-w-0 max-w-full[^"]*overflow-wrap:anywhere/);
  });

  it("contains long unbroken Text beside Media in a nested 50 / 50 Group", () => {
    const token = "WeddingPlatform".repeat(80);
    const nested: CompositionGroup = {
      id: "outer",
      type: "compositionGroup", editorName: "Group 1",
      children: [{
        id: "inner",
        type: "compositionGroup", editorName: "Group 1",
        layout: { direction: "horizontal", division: "50-50" },
        children: [
          { id: "rich", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: token }] }] } },
          { id: "media", type: "media", editorName: "Media 1", items: [{ id: "photo", type: "image", mediaId: "01J00000000000000000000000", alt: "Photo" }] },
        ],
      }],
    };

    const media = { "01J00000000000000000000000": { id: "01J00000000000000000000000", originalFilename: "photo.jpg", width: 100, height: 100, web: { width: 100, height: 100, url: "/photo.jpg" } } };
    const html = renderToStaticMarkup(<GroupElementRenderer group={nested} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} media={media} />);
    expect(html).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(html.match(/class="min-w-0 max-w-full \[overflow-wrap:anywhere\]"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain(token);
    expect(html.indexOf(token)).toBeLessThan(html.indexOf('data-section-child-element="media"'));
    expect(html).not.toMatch(/data-website-element="group"[^>]*overflow-hidden/);
  });

  it.each(["50-50", "60-40", "40-60", "thirds"] as const)("auto-places 1, 2, 3, and 4 children for %s without persisted track assignments", (division) => {
    for (const count of [1, 2, 3, 4]) {
      const children = Array.from({ length: count }, (_, index) => ({ id: `child-${index + 1}`, type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: `Authored ${index + 1}` }] }] } }));
      const candidate: CompositionGroup = { id: `group-${division}-${count}`, type: "compositionGroup", editorName: "Group 1", children, layout: { direction: "horizontal", division } };
      const html = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);

      expect(html).not.toContain("grid-column");
      for (let index = 1; index < count; index += 1) expect(html.indexOf(`Authored ${index}`)).toBeLessThan(html.indexOf(`Authored ${index + 1}`));
      expect(html).toContain("min-w-0 max-w-full [overflow-wrap:anywhere]");
      expect(html).not.toMatch(/overflow-hidden|100vw|w-screen/);
    }
  });

  it("resolves Division from independent viewport overrides and leaves Vertical unchanged", () => {
    const children = [1, 2, 3, 4, 5].map((index) => ({ id: `responsive-third-${index}`, type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: `Responsive ${index}` }] }] } }));
    const candidate: CompositionGroup = { id: "responsive-thirds", type: "compositionGroup", editorName: "Group 1", children, layout: { direction: "horizontal", division: "50-50", responsive: { tablet: { division: "thirds" }, mobile: { direction: "vertical", division: "thirds" } } } };
    const render = (viewport: "desktop" | "tablet" | "mobile") => renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport={viewport} templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    const desktop = render("desktop");
    const tablet = render("tablet");
    const mobile = render("mobile");
    expect(desktop).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(desktop).not.toContain("grid-column");
    expect(tablet).toContain("grid-template-columns:repeat(3,minmax(0,1fr))");
    expect(tablet).not.toContain("grid-column");
    expect(mobile).not.toContain("grid-template-columns");
    expect(mobile).not.toContain("grid-column");
  });

  it("uses the active responsive layout without implicit stacking", () => {
    const candidate: CompositionGroup = { id: "responsive-orphan", type: "compositionGroup", editorName: "Group 1", children: [{ id: "only", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Only"  }] }] }}], layout: { direction: "vertical", division: "thirds", responsive: { tablet: { direction: "horizontal", division: "40-60" }, mobile: { direction: "horizontal", division: "thirds" } } } };
    const render = (viewport: "desktop" | "tablet" | "mobile") => renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport={viewport} templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(render("desktop")).not.toContain("grid-column");
    expect(render("tablet")).not.toContain("grid-column:1 / -1");
    expect(render("mobile")).not.toContain("grid-column:1 / -1");
  });

  it("removes hidden children from Vertical layout without placeholder geometry", () => {
    const candidate: CompositionGroup = { id: "vertical-hidden", type: "compositionGroup", editorName: "Group 1", children: [{ id: "first", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Visible first"  }] }] }}, { id: "hidden", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Hidden middle" }] }] }, isHidden: true }, { id: "last", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Visible last"  }] }] }}], layout: { direction: "vertical", gap: "xl" } };
    const html = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(html).toContain("Visible first");
    expect(html).toContain("Visible last");
    expect(html).not.toContain("Hidden middle");
    expect(html.match(/data-group-child-containment/g)).toHaveLength(2);
  });

  it("auto-places only visible children in two-track divisions", () => {
    for (const division of ["50-50", "40-60", "60-40"] as const) {
      const candidate: CompositionGroup = { id: `hidden-${division}`, type: "compositionGroup", editorName: "Group 1", children: [1, 2, 3, 4].map((index) => ({ id: `child-${index}`, type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: `Visible order ${index}` }] }] }, ...(index === 2 ? { isHidden: true } : {}) })), layout: { direction: "horizontal", division } };
      const html = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport="tablet" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
      expect(html).not.toContain("Visible order 2");
      expect(html).not.toContain("grid-column");
      expect(html.indexOf("Visible order 1")).toBeLessThan(html.indexOf("Visible order 3"));
    }
  });

  it("auto-places only visible children in Thirds", () => {
    const candidate: CompositionGroup = { id: "hidden-thirds", type: "compositionGroup", editorName: "Group 1", children: [1, 2, 3, 4, 5].map((index) => ({ id: `third-${index}`, type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: `Third visible ${index}` }] }] }, ...(index === 2 ? { isHidden: true } : {}) })), layout: { direction: "horizontal", division: "thirds" } };
    const html = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport="mobile" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(html).not.toContain("Third visible 2");
    expect(html).not.toContain("grid-column");
  });

  it("omits a hidden nested Group and all of its geometry", () => {
    const candidate: CompositionGroup = { id: "outer-visible", type: "compositionGroup", editorName: "Group 1", children: [{ id: "nested-hidden", type: "compositionGroup", editorName: "Group 1", isHidden: true, children: [{ id: "nested-copy", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Never rendered"  }] }] }}], layout: { padding: { top: "xl" }, gap: "xl" } }, { id: "visible", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Still rendered"  }] }] }}], layout: { direction: "vertical" } };
    const html = renderToStaticMarkup(<GroupElementRenderer group={candidate} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(html).toContain("Still rendered");
    expect(html).not.toContain("Never rendered");
    expect(html).not.toContain("padding-top:2rem");
    expect(html.match(/data-group-child-containment/g)).toHaveLength(1);
  });

  it("keeps an empty public Group space-free while exposing an editor affordance", () => {
    const empty = createGroupElement("Group 1");
    const published = renderToStaticMarkup(<GroupElementRenderer group={empty} sectionId="date" mode="public" viewport="mobile" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    const editor = renderToStaticMarkup(<GroupElementRenderer group={empty} sectionId="date" mode="editor" viewport="mobile" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(published).not.toContain("min-height");
    expect(published).not.toContain("Empty Group");
    expect(editor).toContain("Empty Group · add children in Structure");
  });

  it("contains decorative backgrounds within the Group in public output", () => {
    const decorated: CompositionGroup = { ...group, appearance: { decorativeAppearance: { background: { texture: "paper", pattern: "botanical" } } } };
    const html = renderToStaticMarkup(<GroupElementRenderer group={decorated} sectionId="date" mode="public" viewport="desktop" templateKey="classic-filipiniana-v1" library={library} projectColors={[]} />);

    expect(html).toMatch(/^<div[^>]*data-website-element="group"[^>]*class="relative isolate"/);
    expect(html).toContain('data-background-decoration="true"');
  });

  it("shows a selectable Group boundary only in the editor", () => {
    const editor = renderToStaticMarkup(<WebsiteElementFrame mode="editor" sectionId="date" elementId="group" elementType="Group" selected onSelect={() => undefined}>
      <GroupElementRenderer group={group} sectionId="date" mode="editor" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} selectedElementId="group" />
    </WebsiteElementFrame>);
    const published = renderToStaticMarkup(<GroupElementRenderer group={group} sectionId="date" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(editor).toContain('data-editor-group="true"');
    expect(editor).toContain('aria-label="Select Group"');
    expect(editor).toContain("editor-group-boundary");
    expect(published).not.toContain("Select Group");
    expect(published).not.toContain("editor-group-boundary");
  });

  it("supports child insertion, reordering updates, nested lookup, and stable ungroup order", () => {
    let flow: SectionChildFlow = { elements: [group], order: [{ kind: "specialized", key: "content" }, { kind: "element", id: group.id }] };
    flow = addGroupChild(flow, group.id, { id: "c", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Third"  }] }] }});
    expect(findSectionElement(flow, "c")?.type).toBe("text");
    flow = updateGroupChildren(flow, group.id, [...group.children].reverse());
    expect((findSectionElement(flow, group.id) as CompositionGroup).children.map(({ id }) => id)).toEqual(["b", "a"]);
    flow = ungroupSectionElement(flow, group.id);
    expect(flow.order).toEqual([{ kind: "specialized", key: "content" }, { kind: "element", id: "b" }, { kind: "element", id: "a" }]);
  });

  it("caps nesting at two Group levels", () => {
    const nested = { id: "one", type: "compositionGroup", editorName: "Group 1", children: [{ id: "two", type: "compositionGroup", editorName: "Group 1", children: [{ id: "three", type: "compositionGroup", editorName: "Group 1", children: [] }] }] };
    expect(compositionGroupSchema.safeParse(nested).success).toBe(false);
    expect(createGroupElement("Group 1")).toMatchObject({ type: "compositionGroup", editorName: "Group 1", children: [] });
    expect(createGroupElement("Group 1")).not.toHaveProperty("layout");
  });

  it("updates nested Text without replacing its Group or identity", () => {
    const flow: SectionChildFlow = { elements: [group], order: [{ kind: "specialized", key: "content" }, { kind: "element", id: "group" }] };
    const updated = updateSectionTextDocument(flow, "a", { type: "doc", children: [{ type: "paragraph", children: [{ text: "Typing works" }] }] });
    expect(findSectionElement(updated ?? undefined, "a")).toMatchObject({ id: "a", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Typing works"  }] }] }});
    expect(findSectionElement(updated ?? undefined, "group")?.type).toBe("compositionGroup");
  });
});
