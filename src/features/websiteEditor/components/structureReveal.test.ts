import { describe, expect, it, vi } from "vitest";
import { revealStructureRow } from "./structureReveal";

const bounds = (top: number, bottom: number) => ({
  top,
  bottom,
  height: bottom - top,
}) as DOMRect;

const elements = (rowTop: number, rowBottom: number) => {
  const scrollBy = vi.fn();
  const container = {
    getBoundingClientRect: () => bounds(0, 200),
    scrollBy,
  } as unknown as HTMLElement;
  const row = {
    getBoundingClientRect: () => bounds(rowTop, rowBottom),
  } as HTMLElement;
  return { container, row, scrollBy };
};

describe("Structure selection reveal", () => {
  it("reveals an off-screen top-level child with minimal downward movement", () => {
    const { container, row, scrollBy } = elements(240, 272);
    expect(revealStructureRow(container, row)).toBe(true);
    expect(scrollBy).toHaveBeenCalledWith({ top: 84, behavior: "auto" });
  });

  it("reveals the exact nested child after its Section is available", () => {
    const { container, row, scrollBy } = elements(310, 342);
    expect(revealStructureRow(container, row)).toBe(true);
    expect(scrollBy).toHaveBeenCalledWith({ top: 154, behavior: "auto" });
  });

  it("does not scroll when the selected row is comfortably visible", () => {
    const { container, row, scrollBy } = elements(60, 92);
    expect(revealStructureRow(container, row)).toBe(false);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("reveals each newly selected row when switching Sections", () => {
    const first = elements(230, 262);
    const second = elements(-42, -10);
    expect(revealStructureRow(first.container, first.row)).toBe(true);
    expect(revealStructureRow(second.container, second.row)).toBe(true);
    expect(first.scrollBy).toHaveBeenCalledOnce();
    expect(second.scrollBy).toHaveBeenCalledOnce();
  });

  it("scrolls only the supplied Structure container", () => {
    const { container, row, scrollBy } = elements(240, 272);
    const rowScroll = vi.fn();
    Object.assign(row, { scrollIntoView: rowScroll });
    revealStructureRow(container, row);
    expect(scrollBy).toHaveBeenCalledOnce();
    expect(rowScroll).not.toHaveBeenCalled();
  });
});
