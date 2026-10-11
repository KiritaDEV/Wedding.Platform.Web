import { describe, expect, it, vi } from "vitest";
import { findEditorTarget, revealEditorTarget, revealScrollDelta } from "./canvasReveal";

const rect = (top: number, bottom: number) => ({ top, bottom, height: bottom - top }) as DOMRect;

function setup(top: number, bottom: number, iframe = false, scale = 1) {
  const scrollBy = vi.fn();
  const matchMedia = vi.fn(() => ({ matches: true }));
  const scrollingElement = { scrollBy } as unknown as Element;
  const ownerDocument = {
    defaultView: { matchMedia },
    documentElement: { clientHeight: 200 },
    scrollingElement,
  } as unknown as Document;
  const marked = iframe ? null : {
    getBoundingClientRect: () => rect(0, 200),
    clientHeight: 200 / scale,
    scrollBy,
  } as unknown as HTMLElement;
  const target = {
    ownerDocument,
    closest: vi.fn(() => marked),
    getBoundingClientRect: () => rect(top, bottom),
  } as unknown as HTMLElement;
  return { target, scrollBy, scrollingElement, marked };
}

describe("editor canvas selection reveal", () => {
  it("reveals an off-screen top-level block with nearest-edge movement", () => {
    const { target, scrollBy } = setup(240, 280);
    expect(revealEditorTarget(target)).toBe(true);
    expect(scrollBy).toHaveBeenCalledWith({ top: 104, behavior: "auto" });
  });

  it("does not scroll an already comfortably visible block", () => {
    const { target, scrollBy } = setup(50, 90);
    expect(revealEditorTarget(target)).toBe(false);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it.each([
    ["100%", 1, 104],
    ["90%", 0.9, 104 / 0.9],
    ["75%", 0.75, 104 / 0.75],
    ["67%", 0.67, 104 / 0.67],
    ["50%", 0.5, 208],
    ["Fit", 0.625, 104 / 0.625],
  ])("converts the %s visual delta to Desktop scroll coordinates once", (_label, scale, expected) => {
    const { target, scrollBy } = setup(240, 280, false, scale as number);
    expect(revealEditorTarget(target)).toBe(true);
    expect(scrollBy).toHaveBeenCalledWith({ top: expected, behavior: "auto" });
  });

  it("uses nearest-edge movement above the comfortable viewport", () => {
    expect(revealScrollDelta(rect(-30, 10), rect(0, 200), 24, 0.5)).toBe(-108);
  });

  it("targets the exact nested Group child by canonical element selector", () => {
    const parent = {} as HTMLElement;
    const nested = {} as HTMLElement;
    const candidate = { querySelector: vi.fn((selector: string) => selector.includes("nested-child") ? nested : parent) } as unknown as Document;
    expect(findEditorTarget([candidate], '[data-editor-website-element="nested-child"]')).toBe(nested);
  });

  it("finds a selected block in the newly selected Section document", () => {
    const first = { querySelector: vi.fn(() => null) } as unknown as Document;
    const selected = {} as HTMLElement;
    const second = { querySelector: vi.fn(() => selected) } as unknown as Document;
    expect(findEditorTarget([first, second], "[data-preview-section=section-b]")).toBe(selected);
  });

  it.each(["tablet", "mobile"])("uses the %s iframe document scrolling element", () => {
    const { target, scrollBy, scrollingElement } = setup(230, 270, true);
    expect(revealEditorTarget(target)).toBe(true);
    expect(target.closest).toHaveBeenCalledWith("[data-editor-preview-scroll]");
    expect(scrollingElement.scrollBy).toBe(scrollBy);
    expect(scrollBy).toHaveBeenCalledOnce();
  });

  it.each([0.5, 0.75, 1])("keeps iframe client and scroll coordinates native at parent scale %s", (parentScale) => {
    const { target, scrollBy } = setup(230, 270, true, parentScale);
    revealEditorTarget(target);
    expect(scrollBy).toHaveBeenCalledWith({ top: 94, behavior: "auto" });
  });

  it("does not scroll when a hidden block has no rendered target", () => {
    const document = { querySelector: vi.fn(() => null) } as unknown as Document;
    expect(findEditorTarget([document], '[data-editor-website-element="hidden"]')).toBeUndefined();
  });

  it("affects only the editor preview container", () => {
    const { target, scrollBy } = setup(-40, 0);
    const pageScroll = vi.fn();
    Object.assign(target.ownerDocument.defaultView!, { scrollBy: pageScroll });
    revealEditorTarget(target);
    expect(scrollBy).toHaveBeenCalledOnce();
    expect(pageScroll).not.toHaveBeenCalled();
  });

  it.each(["direct-child", "group-child", "nested-group-child"])("resolves the exact %s identity", (id) => {
    const expected = { id } as unknown as HTMLElement;
    const candidate = { querySelector: vi.fn(() => expected) } as unknown as Document;
    expect(findEditorTarget([candidate], `[data-editor-website-element="${id}"]`)).toBe(expected);
  });

  it("uses current rects after zoom switching rather than stale scale state", () => {
    let scale = 1;
    const { target, marked, scrollBy } = setup(240, 280);
    Object.defineProperty(marked, "clientHeight", { get: () => 200 / scale });
    revealEditorTarget(target);
    scale = 0.5;
    revealEditorTarget(target);
    expect(scrollBy.mock.calls.map(([options]) => options.top)).toEqual([104, 208]);
  });
});
