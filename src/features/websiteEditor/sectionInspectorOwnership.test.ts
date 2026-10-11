import { describe, expect, it } from "vitest";
import { isSurfaceOnlyParentSelection, resolveOwnedInspectorPanelMode } from "./sectionInspectorOwnership";

describe("Gallery and RSVP inspector ownership", () => {
  it.each(["gallery", "rsvp"])("makes the parent %s selection appearance-only", (sectionType) => {
    expect(isSurfaceOnlyParentSelection(sectionType, false)).toBe(true);
    expect(resolveOwnedInspectorPanelMode(sectionType, false, "content")).toBe("appearance");
  });

  it.each(["gallery", "rsvp"])("keeps Content available for specialized %s content", (sectionType) => {
    expect(isSurfaceOnlyParentSelection(sectionType, true)).toBe(false);
    expect(resolveOwnedInspectorPanelMode(sectionType, true, "content")).toBe("content");
  });

  it("does not change other Section ownership", () => {
    expect(resolveOwnedInspectorPanelMode("hero", false, "content")).toBe("content");
    expect(resolveOwnedInspectorPanelMode("blank", false, "appearance")).toBe("appearance");
  });
});
