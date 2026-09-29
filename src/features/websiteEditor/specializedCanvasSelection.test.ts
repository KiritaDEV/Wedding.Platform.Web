import { describe, expect, it, vi } from "vitest";
import { specializedSectionIdFromTarget } from "./specializedCanvasSelection";

describe("specialized canvas selection", () => {
  it("finds the owning specialized Section without depending on the DOM realm", () => {
    const getAttribute = vi.fn(() => "rsvp-section");
    const closest = vi.fn(() => ({ getAttribute }));
    expect(specializedSectionIdFromTarget({ closest } as unknown as EventTarget)).toBe("rsvp-section");
    expect(closest).toHaveBeenCalledWith("[data-editor-specialized-section-id]");
  });

  it("ignores targets outside specialized content", () => {
    expect(specializedSectionIdFromTarget({ closest: () => null } as unknown as EventTarget)).toBeUndefined();
    expect(specializedSectionIdFromTarget(null)).toBeUndefined();
  });
});
