import { describe, expect, it } from "vitest";
import {
  accordionElementSchema,
  dateElementSchema,
  dividerElementSchema,
  mediaElementSchema,
  peopleElementSchema,
  scheduleElementSchema,
  textElementSchema,
} from "./schemas";

const identity = { id: "block-1", editorName: "Block 1" };
const document = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Copy" }] }] };
const spacing = {
  outerSpacing: { top: "xs", right: "s", bottom: "m", left: "xl" },
  responsive: {
    tablet: { outerSpacing: { top: "l" } },
    mobile: { outerSpacing: { right: "none", left: "xs" } },
  },
};

const cases = [
  [textElementSchema, { ...identity, type: "text", document, appearance: spacing }],
  [dateElementSchema, { ...identity, type: "date", appearance: spacing }],
  [accordionElementSchema, { ...identity, type: "accordion", items: [], appearance: spacing }],
  [scheduleElementSchema, { ...identity, type: "schedule", items: [], appearance: spacing }],
  [peopleElementSchema, { ...identity, type: "people", groups: [], appearance: spacing }],
  [mediaElementSchema, { ...identity, type: "media", items: [], appearance: spacing }],
  [dividerElementSchema, { ...identity, type: "divider", appearance: spacing }],
] as const;

describe("generic block outer spacing schema", () => {
  it.each(cases)("accepts asymmetric responsive spacing for %#", (schema, value) => {
    expect(schema.safeParse(value).success).toBe(true);
  });

  it.each(cases)("rejects unknown presets and fields for %#", (schema, value) => {
    expect(schema.safeParse({ ...value, appearance: { ...spacing, outerSpacing: { top: "huge" } } }).success).toBe(false);
    expect(schema.safeParse({ ...value, appearance: { ...spacing, outerSpacing: { top: "s", horizontal: "m" } } }).success).toBe(false);
    expect(schema.safeParse({ ...value, appearance: { innerSpacing: { top: "s" } } }).success).toBe(false);
  });
});
