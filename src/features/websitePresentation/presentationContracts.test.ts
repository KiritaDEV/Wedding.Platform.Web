import { describe, expect, it } from "vitest";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import { textAppearanceSchema, textElementSchema } from "../websiteElements/schemas";
import { canonicalRuntimeTextAppearanceSchema } from "../websiteElements/textAppearanceContract";
import { actionAppearanceSchema, resolveActionAppearance } from "./actionAppearance";
import { validateActionAppearanceResources, validateChoiceAppearanceResources } from "./appearanceResources";
import { choiceAppearanceSchema, resolveChoiceAppearance } from "./choiceAppearance";
import { resolveRuntimeTextAppearance, resolveRuntimeTextResources, validateRuntimeTextFont } from "./runtimeTextAppearance";
import { PLATFORM_RSVP_PRESENTATION_FALLBACK, rsvpThemePresentation } from "./rsvpThemePresentation";
import { WEBSITE_INTERACTIVE_INVARIANTS } from "./tokens";

const library = {
  colors: [
    { id: "text", displayName: "Text", value: "#111111", roles: [] },
    { id: "accent", displayName: "Accent", value: "#884422", roles: [] },
  ],
} as unknown as TemplateDesignLibrary;

const context = { headingFontId: "playfair-display", bodyFontId: "inter", headingColorId: "text", bodyColorId: "text", accentColorId: "accent" };

describe("canonical runtime Text appearance", () => {
  it("is the typography core of Text while Text retains block spacing", () => {
    const appearance = {
      fontFamilyId: "inter", fontSize: "xl", fontWeight: 700, lineHeight: "tight", letterSpacing: "wide",
      alignment: "center", colorId: "text", italic: true, underline: true, strikethrough: true,
      textTransform: "uppercase", textShadow: "soft", textShadowColorId: "accent", glow: "medium", glowColorId: "accent",
      responsive: { tablet: { fontSize: "l", alignment: "start" }, mobile: { fontSize: "m", alignment: "center" } },
    } as const;
    expect(canonicalRuntimeTextAppearanceSchema.parse(appearance)).toEqual(appearance);
    expect(textAppearanceSchema.parse({ ...appearance, outerSpacing: { top: "m" } })).toEqual({ ...appearance, outerSpacing: { top: "m" } });
    expect(textElementSchema.safeParse({ id: "text", type: "text", editorName: "Text 1", document: { type: "doc", children: [{ type: "paragraph", children: [{ text: "Hello" }] }] }, appearance }).success).toBe(true);
    expect(textAppearanceSchema.safeParse({ fontSize: "enormous" }).success).toBe(false);
  });

  it("rejects authored content, inline marks, block spacing, and editor data", () => {
    for (const invalid of [{ document: {} }, { marks: { bold: true } }, { colorRuns: [] }, { outerSpacing: { top: "m" } }, { selection: {} }]) {
      expect(canonicalRuntimeTextAppearanceSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("resolves sparse and responsive values in fallback-to-exact-device order", () => {
    const resolved = resolveRuntimeTextAppearance({
      fallback: { fontSize: "s", alignment: "start", colorId: "text" },
      theme: { fontSize: "m", responsive: { mobile: { fontSize: "l" } } },
      shared: { alignment: "center" },
      exactDevice: { responsive: { mobile: { alignment: "end" } } },
    }, "mobile");
    expect(resolved).toMatchObject({ fontSize: "l", alignment: "end", colorId: "text" });
    expect(resolved).not.toHaveProperty("responsive");
    expect(resolveRuntimeTextAppearance({ shared: { fontSize: "xs" } }, "desktop", { minimumFontSize: "s" }).fontSize).toBe("s");
  });

  it("uses the canonical font catalog and Website color resolver", () => {
    expect(validateRuntimeTextFont({ fontFamilyId: "not-a-platform-font" })).toBe("Text font family is not supported.");
    const resolved = resolveRuntimeTextResources({ fontFamilyId: "inter", colorId: "accent" }, { templateKey: "classic-filipiniana-v1", library, context });
    expect(resolved.fontFamily).toContain("Inter");
    expect(resolved.color).toBe("#884422");
  });
});

describe("ActionAppearance", () => {
  it("accepts sparse visual properties and rejects semantics and unsupported responsive fields", () => {
    expect(actionAppearanceSchema.safeParse({ variant: "filled", radius: "pill", paddingX: "l", typography: { fontSize: "s" }, responsive: { mobile: { size: "large", width: "full", alignment: "center" } } }).success).toBe(true);
    expect(actionAppearanceSchema.safeParse({ variant: "raised" }).success).toBe(false);
    expect(actionAppearanceSchema.safeParse({ label: "Submit RSVP" }).success).toBe(false);
    expect(actionAppearanceSchema.safeParse({ onClick: "submit" }).success).toBe(false);
    expect(actionAppearanceSchema.safeParse({ responsive: { mobile: { backgroundColorId: "accent" } } }).success).toBe(false);
  });

  it("resolves theme, authored, and responsive overrides", () => {
    const resolved = resolveActionAppearance({ fallback: { size: "normal", width: "intrinsic", variant: "filled" }, theme: { radius: "soft" }, shared: { width: "full" }, exactDevice: { responsive: { mobile: { size: "large", alignment: "center" } } } }, "mobile");
    expect(resolved).toMatchObject({ size: "large", width: "full", variant: "filled", radius: "soft", alignment: "center" });
  });

  it("rejects unresolved Website colors at the resource-validation seam", () => {
    expect(validateActionAppearanceResources({ backgroundColorId: "missing" }, library, [])).toEqual([{ path: "action.backgroundColorId", message: "Website color is not supported." }]);
    expect(validateActionAppearanceResources({ backgroundColorId: "accent" }, library, [])).toEqual([]);
    expect(validateActionAppearanceResources({ typography: { fontFamilyId: "missing-font" } }, library, [])[0]?.path).toBe("action.typography.fontFamilyId");
  });
});

describe("ChoiceAppearance", () => {
  it("accepts state appearance without semantic response values", () => {
    expect(choiceAppearanceSchema.safeParse({ layout: "cards", direction: "row", size: "normal", selected: { backgroundColorId: "accent", emphasis: "bold" }, disabled: { opacity: "muted" } }).success).toBe(true);
    expect(choiceAppearanceSchema.safeParse({ layout: "buttons" }).success).toBe(false);
    expect(choiceAppearanceSchema.safeParse({ response: "attending" }).success).toBe(false);
    expect(choiceAppearanceSchema.safeParse({ responsive: { mobile: { gap: "m" } } }).success).toBe(false);
  });

  it("resolves state colors and responsive direction/size", () => {
    const resolved = resolveChoiceAppearance({ fallback: { layout: "cards", direction: "row", size: "normal", selected: { emphasis: "semibold" } }, theme: { selected: { borderColorId: "accent" } }, shared: { unselected: { textColorId: "text" } }, exactDevice: { responsive: { mobile: { direction: "column", size: "large" } } } }, "mobile");
    expect(resolved).toMatchObject({ direction: "column", size: "large", selected: { emphasis: "semibold", borderColorId: "accent" }, unselected: { textColorId: "text" } });
    expect(validateChoiceAppearanceResources(resolved, library, [])).toEqual([]);
  });

  it("cannot disable renderer-owned accessibility treatment", () => {
    expect(choiceAppearanceSchema.safeParse({ focusRing: "none", selectedIndicator: "none", minimumTouchTarget: 0 }).success).toBe(false);
    expect(WEBSITE_INTERACTIVE_INVARIANTS).toMatchObject({ minimumTouchTargetCssPx: 44, focusIndicatorRequired: true, selectedStateRequiresNonColorCue: true });
  });
});

describe("RSVP Theme presentation defaults", () => {
  it("provides distinct Classic, Modern, and platform-safe contracts", () => {
    const classic = rsvpThemePresentation("classic-filipiniana-v1", context);
    const modern = rsvpThemePresentation("modern-editorial-v1", context);
    expect(classic.choice.layout).toBe("cards");
    expect(modern.choice.layout).toBe("segmented");
    expect(classic.primaryAction.radius).not.toBe(modern.primaryAction.radius);
    expect(rsvpThemePresentation("unknown-template")).toEqual(PLATFORM_RSVP_PRESENTATION_FALLBACK);
  });

  it("reveals the Theme default when an authored override is reset", () => {
    const theme = rsvpThemePresentation("classic-filipiniana-v1", context).primaryAction;
    expect(resolveActionAppearance({ fallback: PLATFORM_RSVP_PRESENTATION_FALLBACK.primaryAction, theme, shared: { width: "full" } }, "desktop").width).toBe("full");
    expect(resolveActionAppearance({ fallback: PLATFORM_RSVP_PRESENTATION_FALLBACK.primaryAction, theme, shared: {} }, "desktop").width).toBe(theme.width);
  });
});
