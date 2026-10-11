import { describe, expect, it } from "vitest";
import { textElementSchema } from "./schemas";
import { changeTextFontFamily, normalizeTextAppearanceForFont, resetTextResponsiveDevice, resolveTextResponsiveAppearance, selectTextGlobalAppearanceProperty, selectTextResponsiveProperty, setTextFontWeight, setTextResponsiveProperty, textFontCapabilities, toggleTextBold, toggleTextItalic } from "./text";

const base = { id: "text-1", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Hello"  }] }] }};

describe("Text schema", () => {
  it("accepts only the canonical document shape", () => {
    expect(textElementSchema.parse(base)).toEqual(base);
    expect(textElementSchema.safeParse({ id: "text-1", type: "text", editorName: "Text 1", text: "legacy" }).success).toBe(false);
  });

  it("accepts the complete strict vocabulary", () => {
    expect(textElementSchema.safeParse({ ...base, appearance: { fontFamilyId: "inter", fontSize: "l", fontWeight: 700, lineHeight: "tight", letterSpacing: "wide", alignment: "center", colorId: "ink-text", italic: true, underline: true, strikethrough: false, textTransform: "uppercase", responsive: { tablet: { fontSize: "m" }, mobile: { alignment: "end" } } } }).success).toBe(true);
  });

  it("counts Unicode code points consistently with the API character limit", () => {
    const withText = (text: string) => ({ ...base, document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text }] }] } });
    expect(textElementSchema.safeParse(withText("😀".repeat(20000))).success).toBe(true);
    expect(textElementSchema.safeParse(withText("😀".repeat(20001))).success).toBe(false);
  });

  it.each([
    { semanticTag: "h1" },
    { appearance: { margin: "1rem" } },
    { appearance: { responsive: { desktop: { fontSize: "l" } } } },
    { appearance: { responsive: { mobile: { italic: true } } } },
    { appearance: { fontFamilyId: "dm-serif-display", fontWeight: 700 } },
    { appearance: { fontFamilyId: "quicksand", italic: true } },
    { appearance: { fontWeight: 500 } },
  ])("rejects obsolete, invalid, or layout-bearing shape %#", (extra) => expect(textElementSchema.safeParse({ ...base, ...extra }).success).toBe(false));
});

describe("Text global appearance editing", () => {
  it("removes values selected back to their effective defaults", () => {
    expect(selectTextGlobalAppearanceProperty({ lineHeight: "tight", underline: true }, "lineHeight", "normal", "normal")).toEqual({ underline: true });
    expect(selectTextGlobalAppearanceProperty({ letterSpacing: "wide" }, "letterSpacing", "normal", "normal")).toEqual({});
    expect(selectTextGlobalAppearanceProperty({ colorId: "accent" }, "colorId", "text", "text")).toEqual({});
  });
});

describe("Text responsive editing", () => {
  const inherited = { fontSize: "s" as const, alignment: "start" as const };
  it("uses independent branches and never lets mobile inherit tablet", () => {
    const appearance = { fontSize: "m" as const, alignment: "center" as const, responsive: { tablet: { fontSize: "xl" as const } } };
    expect(resolveTextResponsiveAppearance(appearance, "desktop", inherited)).toEqual({ fontSize: "m", alignment: "center" });
    expect(resolveTextResponsiveAppearance(appearance, "tablet", inherited)).toEqual({ fontSize: "xl", alignment: "center" });
    expect(resolveTextResponsiveAppearance(appearance, "mobile", inherited)).toEqual({ fontSize: "m", alignment: "center" });
  });

  it("targets and cleans sparse overrides without mutating input", () => {
    const original = { fontSize: "m" as const };
    const pinned = setTextResponsiveProperty(original, "mobile", "fontSize", "m");
    expect(pinned).toEqual({ fontSize: "m", responsive: { mobile: { fontSize: "m" } } });
    expect(original).toEqual({ fontSize: "m" });
    expect(setTextResponsiveProperty(pinned, "mobile", "fontSize", undefined)).toEqual({ fontSize: "m" });
    expect(resetTextResponsiveDevice({ responsive: { tablet: { alignment: "end" }, mobile: { fontSize: "s" } } }, "mobile")).toEqual({ responsive: { tablet: { alignment: "end" } } });
  });

  it("selects effective device values against Desktop and prunes matching overrides", () => {
    const appearance = { fontSize: "xl" as const, alignment: "center" as const, responsive: { tablet: { fontSize: "l" as const }, mobile: { alignment: "end" as const } } };
    expect(selectTextResponsiveProperty(appearance, "tablet", "fontSize", "xl")).toEqual({ fontSize: "xl", alignment: "center", responsive: { mobile: { alignment: "end" } } });
    expect(selectTextResponsiveProperty(appearance, "mobile", "alignment", "center")).toEqual({ fontSize: "xl", alignment: "center", responsive: { tablet: { fontSize: "l" } } });
    expect(selectTextResponsiveProperty({ fontSize: "xl", responsive: { tablet: { fontSize: "l" } } }, "mobile", "fontSize", "l")).toEqual({ fontSize: "xl", responsive: { tablet: { fontSize: "l" }, mobile: { fontSize: "l" } } });
    expect(selectTextResponsiveProperty({ fontSize: "xl", responsive: { mobile: { fontSize: "l" } } }, "mobile", "fontSize", "xl")).toEqual({ fontSize: "xl" });
    const saved = selectTextResponsiveProperty({ fontSize: "xl" }, "tablet", "fontSize", "l");
    expect(textElementSchema.safeParse({ ...base, appearance: saved }).success).toBe(true);
  });

  it("repairs unsupported tuples on font switch", () => {
    expect(changeTextFontFamily({ fontWeight: 700, italic: true }, "dm-serif-display")).toEqual({ fontFamilyId: "dm-serif-display", italic: true });
    expect(changeTextFontFamily({ fontWeight: 700, italic: true }, "quicksand")).toEqual({ fontFamilyId: "quicksand", fontWeight: 700 });
    expect(changeTextFontFamily({ fontFamilyId: "inter", fontWeight: 600, italic: true }, undefined, "dm-serif-display")).toEqual({ italic: true });
    expect(changeTextFontFamily({ fontFamilyId: "inter", fontWeight: 600, italic: true }, "cormorant-garamond")).toEqual({ fontFamilyId: "cormorant-garamond", fontWeight: 600, italic: true });
  });
});

describe("Text font-aware formatting", () => {
  it("exposes only canonical weights supported by the effective family", () => {
    expect(textFontCapabilities("dm-serif-display").weights).toEqual([400]);
    expect(textFontCapabilities("old-standard-tt").weights).toEqual([400, 700]);
    expect(textFontCapabilities("inter").weights).toEqual([400, 600, 700]);
  });

  it("persists Semi-bold and keeps Normal sparse", () => {
    expect(setTextFontWeight({}, "inter", 600)).toEqual({ fontFamilyId: "inter", fontWeight: 600 });
    expect(setTextFontWeight({ fontWeight: 600 }, "inter", 400)).toEqual({});
  });

  it("prevents unsupported Bold and Italic and preserves unrelated responsive state", () => {
    const appearance = { responsive: { tablet: { fontSize: "l" as const }, mobile: { alignment: "center" as const } } };
    expect(toggleTextBold(appearance, "dm-serif-display")).toBe(appearance);
    expect(toggleTextItalic(appearance, "quicksand")).toBe(appearance);
    expect(toggleTextBold(appearance, "inter")).toEqual({ ...appearance, fontFamilyId: "inter", fontWeight: 700 });
    expect(toggleTextItalic(appearance, "inter")).toEqual({ ...appearance, fontFamilyId: "inter", italic: true });
  });

  it("gives inspector weight selection and toolbar Bold the same canonical result", () => {
    expect(setTextFontWeight({}, "inter", 700)).toEqual(toggleTextBold({}, "inter"));
    expect(setTextFontWeight({ fontFamilyId: "inter", fontWeight: 700 }, "inter", 400))
      .toEqual(toggleTextBold({ fontFamilyId: "inter", fontWeight: 700 }, "inter"));
  });

  it("repairs unsupported state deterministically without disturbing valid state", () => {
    expect(normalizeTextAppearanceForFont({ fontWeight: 600, italic: true }, "old-standard-tt")).toEqual({ italic: true });
    expect(normalizeTextAppearanceForFont({ fontWeight: 700, italic: true }, "old-standard-tt")).toEqual({ fontWeight: 700, italic: true });
    expect(normalizeTextAppearanceForFont({ fontWeight: 600, italic: true }, "quicksand")).toEqual({ fontWeight: 600 });
  });

  it("produces states accepted by the canonical save schema", () => {
    const states = [
      setTextFontWeight({}, "inter", 600),
      toggleTextBold({}, "old-standard-tt"),
      toggleTextItalic({}, "dm-serif-display"),
      changeTextFontFamily({ fontFamilyId: "inter", fontWeight: 600, italic: true }, "quicksand"),
    ];
    for (const appearance of states) {
      expect(textElementSchema.safeParse({ ...base, appearance }).success).toBe(true);
    }
  });
});
