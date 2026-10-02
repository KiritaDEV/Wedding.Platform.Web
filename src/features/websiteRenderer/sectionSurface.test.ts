import { describe, expect, it } from "vitest";
import { backgroundTreatmentSchema, opaqueHexColorSchema } from "../websiteEditor/schemas";
import type { WebsiteDesignSettings, WebsiteSectionAppearance } from "../websiteEditor/types";
import { resolveClassicFilipinianaSectionAppearance } from "./templates/classicFilipiniana/appearance";
import { resolveModernEditorialSectionAppearance } from "./templates/modernEditorial/appearance";
import { normalizeOpaqueHex, resolveSectionCustomBackground } from "./sectionSurface";

const library = { colors: [
  { id: "sage-surface", displayName: "Sage Surface", value: "#E6EBDD", allowedProjectRoles: [], allowedElementRoles: [], allowedContainerRoles: [] },
] } as unknown as import("../websiteCapabilities/types").TemplateDesignLibrary;
const projectColors = [{ id: "project-color-01KED9H9XR7WQBP4JTKP1YYQ3F", value: "#1A1A1A" }];

const appearance = (backgroundTreatment: WebsiteSectionAppearance["backgroundTreatment"], customColor?: string): WebsiteSectionAppearance => ({
  headingAlignment: "inherit",
  bodyAlignment: "inherit",
  backgroundTreatment,
  emphasis: "inherit",
  decorativeAppearance: customColor ? { background: { customColor } } : undefined,
});

describe("Section custom background", () => {
  it("parses Custom and normalizes only opaque six-digit hex", () => {
    expect(backgroundTreatmentSchema.parse("custom")).toBe("custom");
    expect(opaqueHexColorSchema.parse("#a1b2c3")).toBe("#A1B2C3");
    for (const invalid of ["#FFF", "#11223344", "rgb(1,2,3)", "rgba(1,2,3,.5)", "red", "var(--x)", "linear-gradient(red, blue)", "url(x)"]) expect(opaqueHexColorSchema.safeParse(invalid).success).toBe(false);
    expect(normalizeOpaqueHex("#abcdef")).toBe("#ABCDEF");
  });
  it("uses Custom only when active and ignores dormant or invalid values", () => {
    expect(resolveSectionCustomBackground(appearance("custom", "#123456"), library, projectColors)).toEqual({ backgroundColor: "#123456" });
    expect(resolveSectionCustomBackground(appearance("soft", "#123456"), library, projectColors)).toBeNull();
    expect(resolveSectionCustomBackground(appearance("custom", "not-css"), library, projectColors)).toBeNull();
  });
  it("prefers semantic colorId and fails safely to legacy or inheritance", () => {
    const custom = appearance("custom", "#123456");
    custom.decorativeAppearance!.background!.colorId = "sage-surface";
    expect(resolveSectionCustomBackground(custom, library, projectColors)).toEqual({ backgroundColor: "#E6EBDD" });
    custom.decorativeAppearance!.background!.colorId = projectColors[0].id;
    expect(resolveSectionCustomBackground(custom, library, projectColors)).toEqual({ backgroundColor: "#1A1A1A" });
    custom.decorativeAppearance!.background!.colorId = "missing";
    expect(resolveSectionCustomBackground(custom, library, projectColors)).toEqual({ backgroundColor: "#123456" });
    delete custom.decorativeAppearance!.background!.customColor;
    expect(resolveSectionCustomBackground(custom, library, projectColors)).toBeNull();
  });
  it("applies the same mechanism in Classic and Modern", () => {
    const custom = appearance("custom", "#234567");
    expect(resolveClassicFilipinianaSectionAppearance("blank", {} as WebsiteDesignSettings, custom, library, projectColors).sectionStyle?.backgroundColor).toBe("#234567");
    expect(resolveModernEditorialSectionAppearance("blank", custom, library, projectColors).sectionStyle?.backgroundColor).toBe("#234567");
  });
  it("applies sparse RSVP direct surface color without a semantic Background preset", () => {
    const direct = { decorativeAppearance: { background: { colorId: "sage-surface" } } };
    const classic = resolveClassicFilipinianaSectionAppearance("rsvp", {} as WebsiteDesignSettings, direct, library, projectColors);
    const modern = resolveModernEditorialSectionAppearance("rsvp", direct, library, projectColors);
    expect(classic.sectionStyle?.backgroundColor).toBe("#E6EBDD");
    expect(modern.sectionStyle?.backgroundColor).toBe("#E6EBDD");
    for (const sectionClass of [classic.sectionClass, modern.sectionClass]) {
      expect(sectionClass).not.toContain("data-section-heading");
      expect(sectionClass).not.toContain("data-section-body");
      expect(sectionClass).not.toContain("data-section-specialized-content");
    }
  });
});

