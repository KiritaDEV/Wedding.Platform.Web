import { describe, expect, it } from "vitest";
import { clampMediaPoint, clampMediaZoom, resolveBackgroundMediaGeometry, resolveContainedMediaGeometry, resolveMediaAspectRatio, resolveMediaCropGeometry, resolveSourcePointFromViewport, resolveSourcePointInViewport, safeMediaSize } from "./mediaCrop";

describe("Media crop geometry", () => {
  it("uses one canonical authored and natural ratio mapping", () => {
    expect(resolveMediaAspectRatio("natural", { width: 1200, height: 800 })).toBe("1200 / 800");
    expect(resolveMediaAspectRatio("square", { width: 1200, height: 800 })).toBe("1 / 1");
    expect(resolveMediaAspectRatio("portrait", { width: 1200, height: 800 })).toBe("3 / 4");
    expect(resolveMediaAspectRatio("landscape", { width: 1200, height: 800 })).toBe("4 / 3");
    expect(resolveMediaAspectRatio("wide", { width: 1200, height: 800 })).toBe("16 / 9");
  });

  it("falls back deterministically for invalid intrinsic dimensions without invalid math", () => {
    for (const size of [{ width: 0, height: 10 }, { width: -1, height: 2 }, { width: Number.NaN, height: Number.POSITIVE_INFINITY }]) {
      expect(safeMediaSize(size)).toEqual({ width: 1, height: 1 });
      expect(resolveMediaAspectRatio("natural", size)).toBe("1 / 1");
      const geometry = resolveMediaCropGeometry({ width: 320, height: 180 }, size, { x: Number.NaN, y: 2 }, Number.POSITIVE_INFINITY);
      expect(Object.values(geometry).flatMap((value) => typeof value === "object" ? Object.values(value) : [value]).every(Number.isFinite)).toBe(true);
    }
  });

  it("clamps point and zoom and calculates cover without distortion", () => {
    expect(clampMediaPoint({ x: -1, y: 2 })).toEqual({ x: 0, y: 1 });
    expect(clampMediaZoom(0)).toBe(1);
    expect(clampMediaZoom(4)).toBe(3);
    expect(clampMediaZoom(1.26)).toBe(1.3);
    const geometry = resolveMediaCropGeometry({ width: 100, height: 100 }, { width: 200, height: 100 }, { x: 0.7, y: 0.3 }, 1.5);
    expect(geometry.width / geometry.height).toBe(2);
    expect(geometry.zoom).toBe(1.5);
  });
});

describe("background cover geometry", () => {
  it.each([
    [{ width: 320, height: 844 }, { width: 1600, height: 900 }],
    [{ width: 320, height: 844 }, { width: 900, height: 1600 }],
    [{ width: 768, height: 1024 }, { width: 1200, height: 1200 }],
    [{ width: 1280, height: 800 }, { width: 1600, height: 900 }],
    [{ width: 1440, height: 900 }, { width: 900, height: 1600 }],
  ])("covers container %o with source %o for every supported zoom and focal point", (container, source) => {
    for (const zoom of [.01, 1, 1.5, 3, 4]) for (const point of [{ x: .5, y: .5 }, { x: 0, y: 0 }, { x: 1, y: 1 }]) {
      const geometry = resolveBackgroundMediaGeometry(container, source, point, zoom);
      expect(geometry.zoom).toBeGreaterThanOrEqual(1);
      expect(geometry.zoom).toBeLessThanOrEqual(3);
      expect(geometry.left).toBeLessThanOrEqual(0);
      expect(geometry.top).toBeLessThanOrEqual(0);
      expect(geometry.left + geometry.width).toBeGreaterThanOrEqual(container.width);
      expect(geometry.top + geometry.height).toBeGreaterThanOrEqual(container.height);
    }
  });

  it.each([
    [{ width: 1440, height: 640 }, { width: 2400, height: 1600 }, { x: .5, y: .5 }, 1],
    [{ width: 1024, height: 700 }, { width: 2400, height: 1600 }, { x: .4, y: .6 }, 1.35],
    [{ width: 390, height: 844 }, { width: 1200, height: 1800 }, { x: .55, y: .45 }, 2.2],
    [{ width: 390, height: 844 }, { width: 2400, height: 1600 }, { x: .5, y: .5 }, 1],
  ])("centers source focal coordinates whenever both axes have sufficient overflow", (container, source, point, zoom) => {
    const geometry = resolveBackgroundMediaGeometry(container, source, point, zoom);
    const transformed = resolveSourcePointInViewport(geometry, point);
    if (geometry.width > container.width && geometry.left < 0 && geometry.left > container.width - geometry.width) expect(transformed.x).toBeCloseTo(container.width / 2);
    if (geometry.height > container.height && geometry.top < 0 && geometry.top > container.height - geometry.height) expect(transformed.y).toBeCloseTo(container.height / 2);
  });

  it("clamps edge focal points to valid image edges at cover and high zoom", () => {
    for (const zoom of [1, 2.2]) {
      const leftTop = resolveBackgroundMediaGeometry({ width: 390, height: 844 }, { width: 1200, height: 1800 }, { x: 0, y: 0 }, zoom);
      expect(leftTop.left).toBe(0);
      expect(leftTop.top).toBe(0);
      const rightBottom = resolveBackgroundMediaGeometry({ width: 390, height: 844 }, { width: 1200, height: 1800 }, { x: 1, y: 1 }, zoom);
      expect(rightBottom.left).toBeCloseTo(390 - rightBottom.width);
      expect(rightBottom.top).toBeCloseTo(844 - rightBottom.height);
    }
  });

  it("maps picker coordinates through the rendered source-image content rect", () => {
    const contained = resolveContainedMediaGeometry({ width: 400, height: 400 }, { width: 1600, height: 900 });
    expect(contained).toEqual({ width: 400, height: 225, left: 0, top: 87.5 });
    expect(resolveSourcePointFromViewport(contained, { x: 100, y: 143.75 })).toEqual({ x: .25, y: .25 });
    expect(resolveSourcePointFromViewport(contained, { x: 200, y: 20 })).toEqual({ x: .5, y: 0 });

    const cropped = resolveBackgroundMediaGeometry({ width: 390, height: 844 }, { width: 1200, height: 1800 }, { x: .42, y: .57 }, 2.2);
    const marker = resolveSourcePointInViewport(cropped, { x: .42, y: .57 });
    expect(marker.x).toBeCloseTo(195);
    expect(marker.y).toBeCloseTo(422);
    expect(resolveSourcePointFromViewport(cropped, marker)).toEqual({ x: .42, y: .57 });
  });
});
