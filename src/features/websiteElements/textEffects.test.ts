import { describe, expect, it } from "vitest";
import { TEXT_SIZES, resolveTextResponsiveAppearance, setTextEffect } from "./text";
import { textElementSchema } from "./schemas";
import { resolveTextEffects, resolveTextGlow, resolveTextShadow } from "./textEffects";
import { elementFontSizes } from "../websiteRenderer/elementTypography";

const base = { id: "text-1", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Hello" }] }] } };

describe("Text display sizes", () => {
  it("preserves the old scale and appends strictly larger display steps", () => {
    expect(elementFontSizes).toEqual({ xs: "0.75rem", s: "0.875rem", m: "1rem", l: "1.5rem", xl: "2.25rem", "2xl": "3rem", "3xl": "4rem", "4xl": "5rem", "5xl": "6rem", "6xl": "7.5rem", "7xl": "9rem" });
    const numeric = TEXT_SIZES.map((size) => Number.parseFloat(elementFontSizes[size]));
    expect(numeric.slice(5).every((size, index) => size > numeric[index + 4])).toBe(true);
  });

  it("resolves every new size independently at every viewport", () => {
    for (const size of ["2xl", "3xl", "4xl", "5xl", "6xl", "7xl"] as const) {
      const appearance = { fontSize: "xl" as const, responsive: { tablet: { fontSize: size }, mobile: { fontSize: "2xl" as const } } };
      expect(resolveTextResponsiveAppearance(appearance, "desktop", { fontSize: "m", alignment: "start" }).fontSize).toBe("xl");
      expect(resolveTextResponsiveAppearance(appearance, "tablet", { fontSize: "m", alignment: "start" }).fontSize).toBe(size);
      expect(resolveTextResponsiveAppearance(appearance, "mobile", { fontSize: "m", alignment: "start" }).fontSize).toBe("2xl");
    }
  });
});

describe("Text effects", () => {
  it.each(["none", "soft", "medium", "strong"] as const)("resolves bounded %s shadow and glow recipes", (strength) => {
    expect(resolveTextShadow(strength, "#123456").length).toBe(strength === "none" ? 0 : strength === "soft" ? 1 : strength === "medium" ? 2 : 2);
    expect(resolveTextGlow(strength, "#abcdef").length).toBe(strength === "none" ? 0 : strength === "soft" ? 1 : strength === "medium" ? 2 : 3);
  });

  it("composes directional shadow before centered glow", () => {
    expect(resolveTextEffects("soft", "#123456", "soft", "#abcdef")).toBe("0 1px 2px #123456, 0 0 4px #abcdef");
  });

  it("keeps defaults sparse and removes inactive effect colors", () => {
    expect(setTextEffect({ textShadow: "strong", textShadowColorId: "ink", glow: "soft", glowColorId: "accent" }, "textShadow", "none")).toEqual({ glow: "soft", glowColorId: "accent" });
    expect(setTextEffect({}, "glow", "none")).toEqual({});
  });

  it("strictly accepts canonical IDs and rejects malformed enums and fields", () => {
    for (const fontSize of TEXT_SIZES) expect(textElementSchema.safeParse({ ...base, appearance: { fontSize } }).success).toBe(true);
    expect(textElementSchema.safeParse({ ...base, appearance: { fontSize: "8xl" } }).success).toBe(false);
    expect(textElementSchema.safeParse({ ...base, appearance: { textShadow: "huge" } }).success).toBe(false);
    expect(textElementSchema.safeParse({ ...base, appearance: { glowColorId: "" } }).success).toBe(false);
    expect(textElementSchema.safeParse({ ...base, appearance: { shadowBlur: 12 } }).success).toBe(false);
  });
});
