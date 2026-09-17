import { describe, expect, it } from "vitest";
import { backgroundMediaSchema, removeBackgroundMediaForDevice, resolveBackgroundMediaForDevice, setBackgroundMediaDeviceFraming } from "./backgroundMedia";

const assetId = "01M00000000000000000000000";

describe("owned background media", () => {
  it.each(["desktop", "tablet", "mobile"] as const)("resolves the owner base on %s", (viewport) => {
    expect(resolveBackgroundMediaForDevice({ assetId, focalPoint: { x: .2, y: .8 }, zoom: 1.5 }, viewport))
      .toEqual({ assetId, focalPoint: { x: .2, y: .8 }, zoom: 1.5 });
  });

  it("uses null as explicit no-image for the whole owner", () => {
    expect(resolveBackgroundMediaForDevice({ assetId: null }, "mobile")).toBeNull();
    expect(removeBackgroundMediaForDevice({ assetId }, "mobile")).toEqual({ assetId: null });
  });

  it("updates base framing regardless of rendered viewport", () => {
    expect(setBackgroundMediaDeviceFraming({ assetId }, "mobile", { zoom: 1.4 })).toEqual({ assetId, zoom: 1.4 });
  });

  it("rejects obsolete responsive overrides and none with framing", () => {
    expect(backgroundMediaSchema.safeParse({ assetId, responsive: { mobile: { assetId: null } } }).success).toBe(false);
    expect(backgroundMediaSchema.safeParse({ assetId: null, zoom: 1.5 }).success).toBe(false);
  });

  it("accepts only the canonical 1x through 3x background zoom range", () => {
    expect(backgroundMediaSchema.safeParse({ assetId, zoom: 1 }).success).toBe(true);
    expect(backgroundMediaSchema.safeParse({ assetId, zoom: 3 }).success).toBe(true);
    expect(backgroundMediaSchema.safeParse({ assetId, zoom: .99 }).success).toBe(false);
    expect(backgroundMediaSchema.safeParse({ assetId, zoom: 3.01 }).success).toBe(false);
  });
});
