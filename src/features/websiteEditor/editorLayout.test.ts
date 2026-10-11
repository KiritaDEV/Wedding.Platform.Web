import { describe, expect, it } from "vitest";
import {
  DESKTOP_EDITOR_GRID_COLUMNS,
  EDITOR_DESKTOP_PANE_WIDTHS,
} from "./editorLayout";
import { EDITOR_DEVICE_VIEWPORTS, PREVIEW_WIDTHS } from "./responsiveViewport";

describe("desktop Website editor layout", () => {
  it("uses the canonical wider Structure pane without changing the inspector or preview contracts", () => {
    expect(EDITOR_DESKTOP_PANE_WIDTHS).toEqual({ structure: 300, inspector: 390 });
    expect(DESKTOP_EDITOR_GRID_COLUMNS).toBe("300px minmax(0, 1fr) 390px");
    expect(PREVIEW_WIDTHS).toEqual({ tablet: 768, mobile: 390 });
    expect(EDITOR_DEVICE_VIEWPORTS).toEqual({
      desktop: { width: 1280, height: 800 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 390, height: 844 },
    });
  });
});
