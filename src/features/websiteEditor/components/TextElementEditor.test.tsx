import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedDesignContext, TemplateDesignLibrary } from "../../websiteCapabilities/types";
import type { TextElement } from "../../websiteElements/types";
import { curatedTextColors, friendlyFontWeightOptions, withTextAppearance } from "../../websiteElements/textAppearance";
import { TextElementEditor } from "./TextElementEditor";
import { Select } from "../../../components/ui/Select";
import { FONT_SIZE_OPTIONS } from "./fontSizeOptions";

const context: ResolvedDesignContext = { headingFontId: "cormorant-garamond", bodyFontId: "inter", headingColorId: "primary", bodyColorId: "text", accentColorId: "accent" };
const library = {
  colors: [
    { id: "primary", displayName: "Internal heading token", value: "#111111" },
    { id: "text", displayName: "Internal text token", value: "#222222" },
    { id: "muted", displayName: "Internal muted token", value: "#777777" },
    { id: "accent", displayName: "Internal accent token", value: "#995533" },
    { id: "shade", displayName: "Internal shade", value: "#eeeeee" },
  ],
  fontFamilies: [
    { id: "inter", displayName: "Inter", family: "Inter", category: "sans", source: { type: "googleFonts", apiFamily: "Inter", upstreamUrl: "https://example.com", version: "x" }, fallback: "sans-serif", weights: [400, 600, 700], styles: ["normal", "italic"], allowedRoles: ["body"], recommendedRoles: ["body"], license: { id: "OFL-1.1" } },
  ],
  fontRecommendations: { heading: [], body: ["inter"], accent: [] },
  palettePresets: [{ id: "default", displayName: "Default", roles: { canvas: "shade", surface: "shade", text: "text", textMuted: "muted", accent: "accent", accentContrast: "shade", border: "muted" } }],
  typographyPresets: [],
} as unknown as TemplateDesignLibrary;
const base: TextElement = { id: "text-1", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Welcome"  }] }] }};

const renderEditor = (element: TextElement = base, viewport: "desktop" | "tablet" | "mobile" = "desktop") => renderToStaticMarkup(<TextElementEditor element={element} viewport={viewport} templateKey="classic-filipiniana-v1" context={context} library={library} allowedFontIds={["inter"]} allowedColorIds={["primary", "text", "muted", "accent", "shade"]} projectColors={[{ id: "project-red", value: "#ff0000" }]} onAddColor={vi.fn()} onAppearanceChange={vi.fn()} />);

describe("TextElementEditor ownership", () => {
  it("uses one compact Font size dropdown with every canonical option", () => {
    const onAppearanceChange = vi.fn();
    const tree = TextElementEditor({ element: base, viewport: "tablet", templateKey: "classic-filipiniana-v1", context, library, allowedFontIds: ["inter"], allowedColorIds: ["primary", "text", "muted", "accent", "shade"], projectColors: [], onAddColor: vi.fn(), onAppearanceChange });
    const fontSize = findSelects(tree).find(({ props }) => props["aria-label"] === "Font size");
    expect(fontSize?.props.options).toEqual(FONT_SIZE_OPTIONS);
    expect(fontSize?.props.value).toBe("m");
    fontSize?.props.onChange("7xl");
    expect(onAppearanceChange).toHaveBeenCalledWith({ responsive: { tablet: { fontSize: "7xl" } } });

    const reset = vi.fn();
    const overridden = TextElementEditor({ element: { ...base, appearance: { responsive: { tablet: { fontSize: "7xl" } } } }, viewport: "tablet", templateKey: "classic-filipiniana-v1", context, library, allowedFontIds: ["inter"], allowedColorIds: ["primary", "text", "muted", "accent", "shade"], projectColors: [], onAddColor: vi.fn(), onAppearanceChange: reset });
    findSelects(overridden).find(({ props }) => props["aria-label"] === "Font size")?.props.onChange("m");
    expect(reset).toHaveBeenCalledWith(undefined);
  });

  it("shows bounded block effects sparsely and hides inactive color controls", () => {
    const inactive = renderEditor(base);
    expect(inactive).toContain("Effects");
    expect(inactive).toContain('aria-label="Text Shadow"');
    expect(inactive).toContain('aria-label="Glow"');
    expect(inactive).not.toContain('aria-label="Shadow Color"');
    expect(inactive).not.toContain('aria-label="Glow Color"');
    const active = renderEditor({ ...base, appearance: { textShadow: "soft", glow: "medium" } });
    expect(active).toContain('aria-label="Shadow Color"');
    expect(active).toContain('aria-label="Glow Color"');
  });
  it("keeps content authoring out of the appearance-only inspector", () => {
    const html = renderEditor();
    expect(html).not.toContain("Text Style");
    expect(html).not.toContain('textarea');
    expect(html).not.toContain('value="Welcome"');
    expect(html).toContain("Font family");
    expect(html).not.toContain("Semantic");
    expect(html).not.toMatch(/>H[1-6]</);
  });

  it("keeps typography and compact formatting in Appearance", () => {
    const html = renderEditor({ ...base, appearance: { fontFamilyId: "inter", fontWeight: 700, italic: true } });
    expect(html).not.toContain("Text Style");
    expect(html).toContain("Font family");
    expect(html).toContain('aria-label="Font weight"');
    expect(html).toContain("Bold");
    expect(html).not.toContain('aria-label="Italic"');
    expect(html).toContain('aria-label="Text case"');
    expect(html).not.toContain("Semantic");
  });

  it("uses direct formatting toggles and the shared font-weight control on mobile", () => {
    const html = renderEditor({ ...base, appearance: { fontWeight: 700 } }, "mobile");
    expect(html).toContain('aria-label="Bold"');
    expect(html).toContain('aria-label="Font weight"');
    expect(html).toMatch(/aria-label="Font weight"[^>]*>[\s\S]*?>Bold</);
  });

  it("shows only weights supported by the selected family", () => {
    expect(friendlyFontWeightOptions("dm-serif-display")).toEqual([{ value: "400", label: "Normal" }]);
    expect(friendlyFontWeightOptions("old-standard-tt")).toEqual([{ value: "400", label: "Normal" }, { value: "700", label: "Bold" }]);
    expect(friendlyFontWeightOptions("old-standard-tt").some(({ label }) => label === "Semi-bold")).toBe(false);
    expect(friendlyFontWeightOptions("inter")).toEqual([{ value: "400", label: "Normal" }, { value: "600", label: "Semi-bold" }, { value: "700", label: "Bold" }]);
  });

  it("uses the same compact font-weight dropdown as Date", () => {
    const onAppearanceChange = vi.fn();
    const tree = TextElementEditor({ element: base, viewport: "desktop", templateKey: "classic-filipiniana-v1", context, library, allowedFontIds: ["inter"], allowedColorIds: ["primary", "text", "muted", "accent", "shade"], projectColors: [], onAddColor: vi.fn(), onAppearanceChange });
    const fontWeight = findSelects(tree).find(({ props }) => props["aria-label"] === "Font weight");
    expect(fontWeight?.props.options).toEqual(friendlyFontWeightOptions("inter"));
    expect(fontWeight?.props.value).toBe("400");
    fontWeight?.props.onChange("700");
    expect(onAppearanceChange).toHaveBeenCalledWith({
      fontFamilyId: "inter",
      fontWeight: 700,
    });
  });

  it("uses a compact line-height dropdown", () => {
    const tree = TextElementEditor({ element: base, viewport: "desktop", templateKey: "classic-filipiniana-v1", context, library, allowedFontIds: ["inter"], allowedColorIds: ["primary", "text", "muted", "accent", "shade"], projectColors: [], onAddColor: vi.fn(), onAppearanceChange: vi.fn() });
    const lineHeight = findSelects(tree).find(({ props }) => props["aria-label"] === "Line height");
    expect(lineHeight?.props.value).toBe("normal");
    expect(lineHeight?.props.options).toEqual([
      { value: "tight", label: "Tight" },
      { value: "normal", label: "Normal" },
      { value: "relaxed", label: "Relaxed" },
    ]);
  });

  it("uses a compact letter-spacing dropdown", () => {
    const tree = TextElementEditor({ element: base, viewport: "desktop", templateKey: "classic-filipiniana-v1", context, library, allowedFontIds: ["inter"], allowedColorIds: ["primary", "text", "muted", "accent", "shade"], projectColors: [], onAddColor: vi.fn(), onAppearanceChange: vi.fn() });
    const letterSpacing = findSelects(tree).find(({ props }) => props["aria-label"] === "Letter spacing");
    expect(letterSpacing?.props.value).toBe("normal");
    expect(letterSpacing?.props.options).toEqual([
      { value: "tight", label: "Tight" },
      { value: "normal", label: "Normal" },
      { value: "wide", label: "Wide" },
    ]);
  });

  it("uses a compact text-case dropdown", () => {
    const tree = TextElementEditor({ element: base, viewport: "desktop", templateKey: "classic-filipiniana-v1", context, library, allowedFontIds: ["inter"], allowedColorIds: ["primary", "text", "muted", "accent", "shade"], projectColors: [], onAddColor: vi.fn(), onAppearanceChange: vi.fn() });
    const textCase = findSelects(tree).find(({ props }) => props["aria-label"] === "Text case");
    expect(textCase?.props.value).toBe("none");
    expect(textCase?.props.options).toEqual([
      { value: "none", label: "Original case" },
      { value: "uppercase", label: "Uppercase" },
      { value: "lowercase", label: "Lowercase" },
      { value: "capitalize", label: "Capitalize" },
    ]);
  });

  it("uses a compact alignment dropdown", () => {
    const tree = TextElementEditor({ element: base, viewport: "desktop", templateKey: "classic-filipiniana-v1", context, library, allowedFontIds: ["inter"], allowedColorIds: ["primary", "text", "muted", "accent", "shade"], projectColors: [], onAddColor: vi.fn(), onAppearanceChange: vi.fn() });
    const alignment = findSelects(tree).find(({ props }) => props["aria-label"] === "Alignment");
    expect(alignment?.props.value).toBe("start");
    expect(alignment?.props.options).toEqual([
      { value: "start", label: "Start" },
      { value: "center", label: "Center" },
      { value: "end", label: "End" },
    ]);
  });

  it("curates semantic colors, hides unrelated shades, and retains project colors", () => {
    expect(curatedTextColors(library, ["primary", "text", "muted", "accent", "shade"], context).map(({ displayName }) => displayName)).toEqual(["Primary", "Accent", "Text", "Muted"]);
    const html = renderEditor();
    expect(html).not.toContain("Internal shade");
    expect(html).toContain("Custom color #ff0000");
    expect(html).toContain("Add color");
  });

  it.each(["desktop", "tablet", "mobile"] as const)("uses effective values without reset affordances on %s", (viewport) => {
    const html = renderEditor(base, viewport);
    expect(html).not.toContain("Reset");
    expect(html).not.toContain('aria-label="Inherited"');
    expect(html).toContain('aria-label="Line height"');
    expect(html).toContain('aria-label="Letter spacing"');
    expect(html).toMatch(/aria-checked="true"[^>]*aria-label="Text"/);
  });

  it("displays authored global values instead of their effective defaults", () => {
    const html = renderEditor({ ...base, appearance: { lineHeight: "relaxed", letterSpacing: "wide", colorId: "accent" } });
    expect(html).toMatch(/aria-label="Line height"[^>]*>[\s\S]*?>Relaxed</);
    expect(html).toMatch(/aria-label="Letter spacing"[^>]*>[\s\S]*?>Wide</);
    expect(html).toMatch(/aria-checked="true"[^>]*aria-label="Accent"/);
  });

  it("prunes the appearance object after its final default-equivalent value is selected", () => {
    expect(withTextAppearance({ ...base, appearance: { lineHeight: "tight" } }, {})).toEqual(base);
  });
});

function findSelects(node: ReactNode): Array<ReactElement<ComponentProps<typeof Select>>> {
  if (Array.isArray(node)) return node.flatMap(findSelects);
  if (!isValidElement(node)) return [];
  const element = node as ReactElement<{ children?: ReactNode }>;
  return [...(element.type === Select ? [element as ReactElement<ComponentProps<typeof Select>>] : []), ...Children.toArray(element.props.children).flatMap(findSelects)];
}

describe("direct Text typography", () => {
  it.each(["tablet", "mobile"] as const)("shows effective Desktop font size and alignment on untouched %s controls", (viewport) => {
    const html = renderEditor({ ...base, appearance: { fontSize: "xl", alignment: "center" } }, viewport);
    expect(html).toContain("Heading · 36 px");
    expect(html).toContain('aria-label="Font size"');
    expect(html).toMatch(/aria-label="Alignment"[^>]*>[\s\S]*?>Center</);
    expect(html).not.toContain("Use desktop size");
    expect(html).not.toContain("Use desktop alignment");
  });
});
