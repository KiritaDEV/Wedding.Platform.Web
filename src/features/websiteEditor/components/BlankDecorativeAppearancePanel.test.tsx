import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SectionCapability, TemplateDesignLibrary } from "../../websiteCapabilities/types";
import type { WebsiteSectionAppearance } from "../types";
import { AppearancePanel } from "./AppearancePanel";

const appearance: WebsiteSectionAppearance = { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit" };
const capability = {
  id: "blank", appearanceControls: [], defaultPresentation: null, presentations: [],
  contextDefaults: { typography: [], colors: [] },
  allowedElementTypes: [], maximumElementCount: 20, compositionGroups: null,
  decorativeAppearance: {
    textures: ["none", "paper"], patterns: ["none", "botanical"], overlays: ["none", "soft"], frames: ["none", "fine"], backgroundColorIds: [], frameColorIds: ["frame-color"],
  },
} as unknown as SectionCapability;
const library = { colors: [], fontFamilies: [], palettePresets: [], typographyPresets: [] } as unknown as TemplateDesignLibrary;

describe("Blank decorative appearance controls", () => {
  it("exposes the shared controls without persisting defaults when opened", () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<AppearancePanel appearance={appearance} templateKey="classic-filipiniana-v1" sectionCapability={capability} targetViewport="desktop" error={null} library={library} projectColors={[]} onAddColor={async () => { throw new Error("not called"); }} onChange={onChange} />);
    expect(html).toContain("Section background color");
    for (const label of ["Texture", "Pattern", "Overlay", "Frame"]) expect(html).toContain(label);
    for (const label of ["Section texture", "Section pattern", "Section overlay", "Section frame"]) expect(html).toContain(`aria-label="${label}"`);
    for (const helper of ["No texture", "No pattern", "No tonal overlay", "No decorative frame"]) expect(html).not.toContain(helper);
    for (const removed of ["Heading alignment", "Content alignment", "Use Template", ">Emphasis<", 'title="Standard"', 'title="Featured"', 'title="Subtle"', "Heading Font", "Body Font", "Heading Color", "Body Color", "Accent Color"]) expect(html).not.toContain(removed);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes texture and pattern strength controls when their effects are selected", () => {
    const html = renderToStaticMarkup(<AppearancePanel appearance={{ ...appearance, decorativeAppearance: { background: { texture: "paper", pattern: "botanical" } } }} templateKey="classic-filipiniana-v1" sectionCapability={capability} targetViewport="desktop" error={null} library={library} projectColors={[]} onAddColor={async () => { throw new Error("not called"); }} onChange={vi.fn()} />);
    expect(html).toContain("Texture Strength");
    expect(html).toContain("Pattern Strength");
  });

  it.each([
    ["classic-filipiniana-v1", "fine", "42% · Theme"],
    ["classic-filipiniana-v1", "ornamental", "60% · Theme"],
    ["modern-editorial-v1", "fine", "28% · Theme"],
  ] as const)("shows generic controls for %s %s and Theme defaults without authoring values", (templateKey, style, strengthLabel) => {
    const styleCapability = { ...capability, decorativeAppearance: { ...capability.decorativeAppearance!, frames: ["none", "fine", "ornamental"] } } as unknown as SectionCapability;
    const html = renderToStaticMarkup(<AppearancePanel appearance={{ ...appearance, decorativeAppearance: { frame: { style } } }} templateKey={templateKey} sectionCapability={styleCapability} targetViewport="desktop" error={null} library={library} projectColors={[]} onAddColor={async () => { throw new Error("not called"); }} onChange={vi.fn()} />);
    for (const label of ["Frame Size", "Frame Strength", "Frame Color", "100% · Theme", strengthLabel]) expect(html).toContain(label);
  });

  it("hides generic controls when the Frame is none", () => {
    const html = renderToStaticMarkup(<AppearancePanel appearance={{ ...appearance, decorativeAppearance: { frame: { style: "none" } } }} templateKey="classic-filipiniana-v1" sectionCapability={capability} targetViewport="desktop" error={null} library={library} projectColors={[]} onAddColor={async () => { throw new Error("not called"); }} onChange={vi.fn()} />);
    for (const label of ["Frame Size", "Frame Strength", "Frame Color"]) expect(html).not.toContain(label);
  });
});

describe.each(["gallery", "rsvp"])("%s decorative appearance controls", (id) => {
  it("exposes the generic Section Frame control", () => {
    const onChange = vi.fn();
    const sectionCapability = { ...capability, id } as unknown as SectionCapability;
    const html = renderToStaticMarkup(<AppearancePanel appearance={appearance} templateKey="classic-filipiniana-v1" sectionCapability={sectionCapability} targetViewport="mobile" error={null} library={library} projectColors={[]} onAddColor={async () => { throw new Error("not called"); }} onChange={onChange} />);
    for (const label of ["Texture", "Pattern", "Overlay", "Frame"]) expect(html).toContain(label);
    expect(html).not.toContain("Frame style");
    expect(onChange).not.toHaveBeenCalled();
  });
});
