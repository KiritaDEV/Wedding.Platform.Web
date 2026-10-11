import { describe, expect, it } from "vitest";
import { resetImageFraming } from "./resetImageFraming";

describe("FocalPointEditor", () => {
  it("resets image framing to centered 1x cover", () => {
    expect(resetImageFraming()).toEqual({ point: { x: 0.5, y: 0.5 }, zoom: 1 });
  });
});
