import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SectionCapability, TemplateDesignLibrary } from "../../websiteCapabilities/types";
import type { WebsiteSectionAppearance } from "../types";
import { AppearancePanel } from "./AppearancePanel";

const appearance: WebsiteSectionAppearance = { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit" };
const capability = { id: "hero", appearanceControls: [], defaultPresentation: null, presentations: [], contextDefaults: { typography: [], colors: [] }, allowedElementTypes: [], maximumElementCount: 20, compositionGroups: null, decorativeAppearance: { textures: [], patterns: [], overlays: [], frames: [], backgroundColorIds: [], frameColorIds: [] } } as unknown as SectionCapability;
const library = { colors: [], fontFamilies: [], palettePresets: [], typographyPresets: [] } as unknown as TemplateDesignLibrary;
const render = (value: WebsiteSectionAppearance) => renderToStaticMarkup(<AppearancePanel appearance={value} templateKey="classic-filipiniana-v1" sectionCapability={capability} targetViewport="desktop" error={null} library={library} projectColors={[]} onAddColor={async () => { throw new Error("not called"); }} onChange={vi.fn()} />);

describe("Hero minimum height control", () => {
  it("shows sparse Automatic semantics without authoring a value", () => {
    const html = render(appearance);
    expect(html).toContain("Minimum height");
    expect(html).toContain("Automatic");
    expect(html).toContain("Custom");
    expect(html).toContain("Height follows the Hero content.");
    expect(html).not.toContain('aria-label="Hero minimum height"');
  });

  it("shows the strict svh range and Full screen numeric shortcut for Custom", () => {
    const html = render({ ...appearance, height: { unit: "svh", value: 75 } });
    expect(html).toContain('aria-label="Hero minimum height"');
    expect(html).toContain('min="25"');
    expect(html).toContain('max="150"');
    expect(html).toContain('step="5"');
    expect(html).toContain("75svh");
    expect(html).toContain("100svh · Full screen");
    expect(html).toContain("The Hero grows if its content needs more space.");
  });
});
