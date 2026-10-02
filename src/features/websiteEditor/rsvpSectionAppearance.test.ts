import { describe, expect, it } from "vitest";
import { rsvpSectionAppearanceSchema } from "./schemas";
import { applySectionBackgroundColor } from "./sectionBackgroundAuthoring";

describe("RSVP Section appearance contract", () => {
  it("accepts only sparse Section-surface appearance", () => {
    const surface = {
      innerSpacing: { top: "xl" as const, right: "s" as const, bottom: "m" as const, left: "xs" as const },
      decorativeAppearance: {
        background: { colorId: "terracotta-canvas", texture: "paper" as const, pattern: "botanical" as const, overlay: "soft" as const },
        frame: { style: "fine" as const },
      },
    };
    expect(rsvpSectionAppearanceSchema.parse(surface)).toEqual(surface);
    for (const obsolete of ["headingAlignment", "bodyAlignment", "backgroundTreatment", "emphasis"] as const) {
      expect(rsvpSectionAppearanceSchema.safeParse({ ...surface, [obsolete]: "inherit" }).success).toBe(false);
    }
  });

  it("rejects invalid RSVP Section inner spacing", () => {
    expect(rsvpSectionAppearanceSchema.safeParse({ innerSpacing: { top: "huge" } }).success).toBe(false);
    expect(rsvpSectionAppearanceSchema.safeParse({ innerSpacing: { diagonal: "m" } }).success).toBe(false);
  });

  it("authors Background Color without restoring a semantic preset", () => {
    expect(applySectionBackgroundColor({}, "terracotta-canvas", true)).toEqual({
      decorativeAppearance: { background: { colorId: "terracotta-canvas" } },
    });
  });
});
