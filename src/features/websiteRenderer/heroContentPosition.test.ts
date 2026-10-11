import { describe, expect, it } from "vitest";
import { HERO_CONTENT_POSITIONS, heroContentPositionStyle, resolveHeroContentPosition } from "./heroContentPosition";
import type { WebsiteSectionAppearance } from "../websiteEditor/types";
import { INNER_SPACING_CSS, resolveInnerSpacing } from "../websiteElements/group";

const base = { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit" } as WebsiteSectionAppearance;

describe("Hero content position", () => {
  it("maps all nine positions to independent cluster alignment", () => {
    expect(HERO_CONTENT_POSITIONS).toHaveLength(9);
    expect(heroContentPositionStyle("top-start")).toEqual({ alignItems: "flex-start", justifyContent: "flex-start" });
    expect(heroContentPositionStyle("top-center")).toEqual({ alignItems: "center", justifyContent: "flex-start" });
    expect(heroContentPositionStyle("top-end")).toEqual({ alignItems: "flex-end", justifyContent: "flex-start" });
    expect(heroContentPositionStyle("center-start")).toEqual({ alignItems: "flex-start", justifyContent: "center" });
    expect(heroContentPositionStyle("center")).toEqual({ alignItems: "center", justifyContent: "center" });
    expect(heroContentPositionStyle("center-end")).toEqual({ alignItems: "flex-end", justifyContent: "center" });
    expect(heroContentPositionStyle("bottom-start")).toEqual({ alignItems: "flex-start", justifyContent: "flex-end" });
    expect(heroContentPositionStyle("bottom-center")).toEqual({ alignItems: "center", justifyContent: "flex-end" });
    expect(heroContentPositionStyle("bottom-end")).toEqual({ alignItems: "flex-end", justifyContent: "flex-end" });
  });

  it("defaults sparsely and resolves Tablet and Mobile directly from Desktop", () => {
    expect(resolveHeroContentPosition(base, "desktop")).toBe("center");
    const appearance: WebsiteSectionAppearance = { ...base, contentPosition: "center-end", responsive: { tablet: { contentPosition: "top-center" }, mobile: { contentPosition: "bottom-center" } } };
    expect(resolveHeroContentPosition(appearance, "desktop")).toBe("center-end");
    expect(resolveHeroContentPosition(appearance, "tablet")).toBe("top-center");
    expect(resolveHeroContentPosition(appearance, "mobile")).toBe("bottom-center");
    expect(resolveHeroContentPosition({ ...appearance, responsive: { tablet: { contentPosition: "top-center" } } }, "mobile")).toBe("center-end");
  });

  it("shares Group spacing presets and resolves sparse device sides directly from Desktop", () => {
    expect(INNER_SPACING_CSS).toEqual({ none: "0", xs: "0.25rem", s: "0.5rem", m: "1rem", l: "1.5rem", xl: "2rem" });
    const desktop = { top: "xl", right: "s", bottom: "m" } as const;
    expect(resolveInnerSpacing(desktop, { left: "l", top: "s" })).toEqual({ top: "s", right: "s", bottom: "m", left: "l" });
    expect(resolveInnerSpacing(desktop, undefined)).toEqual(desktop);
  });
});
