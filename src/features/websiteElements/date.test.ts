import { describe, expect, it } from "vitest";
import { dateElementSchema } from "./schemas";
import { TEXT_SIZES } from "./text";

describe("dateElementSchema", () => {
  const base = { id: "date", type: "date", editorName: "Date 1" } as const;
  it("accepts sparse bounded appearance", () => {
    expect(dateElementSchema.safeParse({ ...base, appearance: { format: "numeric", showWeekday: false, alignment: "center", fontFamilyId: "inter", fontSize: "l", fontWeight: 700, lineHeight: "relaxed", letterSpacing: "wide", textTransform: "uppercase", colorId: "accent", responsive: { mobile: { fontSize: "s", alignment: "end" } } } }).success).toBe(true);
    expect(dateElementSchema.safeParse({ ...base, appearance: { textStyle: "heading" } }).success).toBe(false);
    expect(dateElementSchema.parse(base)).toEqual(base);
  });
  it("rejects arbitrary formatting and responsive overrides", () => {
    expect(dateElementSchema.safeParse({ ...base, appearance: { format: "YYYY-MM-DD" } }).success).toBe(false);
    expect(dateElementSchema.safeParse({ ...base, appearance: { responsive: { watch: {} } } }).success).toBe(false);
  });
  it("shares every canonical Text size and rejects unknown values", () => {
    for (const fontSize of TEXT_SIZES) expect(dateElementSchema.safeParse({ ...base, appearance: { fontSize } }).success).toBe(true);
    expect(dateElementSchema.safeParse({ ...base, appearance: { fontSize: "8xl" } }).success).toBe(false);
  });
});
