import { describe, expect, it } from "vitest";
import { sectionAppearanceSchema } from "./schemas";
import { setHeroHeightMode, setHeroMinimumHeight } from "./heroMinimumHeight";
import type { WebsiteSectionAppearance } from "./types";

const appearance: WebsiteSectionAppearance = { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit" };

describe("Hero minimum height", () => {
  it("keeps Automatic sparse and initializes Custom to 75svh", () => {
    expect(setHeroHeightMode(appearance, "automatic")).not.toHaveProperty("height");
    expect(setHeroHeightMode(appearance, "custom").height).toEqual({ unit: "svh", value: 75 });
    expect(setHeroHeightMode(setHeroMinimumHeight(appearance, 125), "custom").height).toEqual({ unit: "svh", value: 125 });
    expect(setHeroHeightMode(setHeroMinimumHeight(appearance, 100), "automatic")).not.toHaveProperty("height");
  });

  it("persists authored values and represents Full screen as numeric 100svh", () => {
    expect(setHeroMinimumHeight(appearance, 50).height).toEqual({ unit: "svh", value: 50 });
    expect(setHeroMinimumHeight(appearance, 100).height).toEqual({ unit: "svh", value: 100 });
  });

  it.each([25, 100, 150])("accepts %isvh", (value) => {
    expect(sectionAppearanceSchema.safeParse({ ...appearance, height: { unit: "svh", value } }).success).toBe(true);
  });

  it.each(["auto", "screen", "75svh", { unit: "vh", value: 75 }, { unit: "px", value: 600 }, { unit: "svh", value: 24 }, { unit: "svh", value: 151 }, { unit: "svh", value: 75.5 }, { unit: "svh", value: 75, extra: true }])("rejects invalid height %o", (height) => {
    expect(sectionAppearanceSchema.safeParse({ ...appearance, height }).success).toBe(false);
  });
});
