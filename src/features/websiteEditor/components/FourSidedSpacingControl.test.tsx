import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FourSidedSpacingControl } from "./FourSidedSpacingControl";
import { spacingAxisChanges, spacingAxisValue, spacingSideChanges } from "./spacingControlModel";

describe("FourSidedSpacingControl", () => {
  it("renders only compact axis controls by default", () => {
    const html = renderToStaticMarkup(<FourSidedSpacingControl spacing={{}} onChange={() => undefined} />);
    expect(html).toContain('aria-label="Vertical spacing"');
    expect(html).toContain('aria-label="Horizontal spacing"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('aria-label="Top"');
    expect(html).not.toContain("HERO");
  });

  it("reveals all four authoritative sides when expanded", () => {
    const html = renderToStaticMarkup(<FourSidedSpacingControl defaultExpanded spacing={{ top: "xs", right: "s", bottom: "m", left: "l" }} onChange={() => undefined} />);
    expect(html).toContain('aria-expanded="true"');
    for (const side of ["Top", "Right", "Bottom", "Left"]) expect(html).toContain(`aria-label="${side}"`);
  });

  it("does not mutate values merely by rendering either expansion state", () => {
    const onChange = vi.fn();
    renderToStaticMarkup(<FourSidedSpacingControl spacing={{ top: "xs", bottom: "l" }} onChange={onChange} />);
    renderToStaticMarkup(<FourSidedSpacingControl defaultExpanded spacing={{ top: "xs", bottom: "l" }} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("maps axis edits to exactly their two sides", () => {
    expect(spacingAxisChanges("vertical", "m")).toEqual({ top: "m", bottom: "m" });
    expect(spacingAxisChanges("horizontal", "xl")).toEqual({ left: "xl", right: "xl" });
  });

  it("maps a per-side edit only to the selected side", () => {
    expect(spacingSideChanges("right", "l")).toEqual({ right: "l" });
  });

  it("reports matching and mixed axis values", () => {
    expect(spacingAxisValue({ top: "s", bottom: "s" }, "vertical")).toBe("s");
    expect(spacingAxisValue({ top: "s", bottom: "l" }, "vertical")).toBe("mixed");
    expect(spacingAxisValue({ left: "none", right: "none" }, "horizontal")).toBe("none");
    expect(spacingAxisValue({ left: "xs", right: "m" }, "horizontal")).toBe("mixed");
  });

  it("shows Mixed while retaining canonical choices that normalize the pair", () => {
    const html = renderToStaticMarkup(<FourSidedSpacingControl spacing={{ top: "xs", bottom: "xl" }} onChange={() => undefined} />);
    expect(html).toContain("Mixed");
    expect(spacingAxisChanges("vertical", "l")).toEqual({ top: "l", bottom: "l" });
  });
});
