import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { authoredAnimationSchema, normalizeAuthoredAnimation } from "./contract";
import { resolveAppearanceAnimation } from "./resolve";
import { WebsiteMotion, WebsiteMotionRuntime } from "./runtime";
import { websiteElementSchema } from "../websiteElements/schemas";
import { rsvpSectionAppearanceSchema, sectionAppearanceSchema } from "../websiteEditor/schemas";

const effects = ["none", "fade", "fade-up", "fade-down", "scale-in"] as const;

describe("canonical Website animation contract", () => {
  it.each(effects)("accepts %s", (type) => {
    expect(authoredAnimationSchema.safeParse({ entrance: { type } }).success).toBe(true);
  });

  it.each(["fast", "normal", "slow"] as const)("accepts %s speed", (speed) => {
    expect(authoredAnimationSchema.safeParse({ entrance: { type: "fade", speed } }).success).toBe(true);
  });

  it.each(["none", "short", "medium", "long"] as const)("accepts %s delay", (delay) => {
    expect(authoredAnimationSchema.safeParse({ entrance: { type: "fade", delay } }).success).toBe(true);
  });

  it("rejects unknown keys, invalid enums, arbitrary CSS, and nested responsive state", () => {
    for (const value of [
      { entrance: { type: "slide" } },
      { entrance: { type: "fade", duration: 300 } },
      { entrance: { type: "fade", transform: "translateX(20px)" } },
      { entrance: { type: "fade" }, responsive: { mobile: {} } },
      { css: { opacity: 0 } },
    ]) expect(authoredAnimationSchema.safeParse(value).success).toBe(false);
  });

  it("normalizes sparse defaults while preserving an exact-device none override", () => {
    expect(normalizeAuthoredAnimation(undefined)).toBeUndefined();
    expect(normalizeAuthoredAnimation({})).toBeUndefined();
    expect(normalizeAuthoredAnimation({ entrance: { speed: "fast", delay: "long" } })).toBeUndefined();
    expect(normalizeAuthoredAnimation({ entrance: { type: "none", speed: "slow" } })).toBeUndefined();
    expect(normalizeAuthoredAnimation({ entrance: { type: "none" } }, { preserveExplicitNone: true })).toEqual({ entrance: { type: "none" } });
  });

  it("uses the existing base and exact-device appearance owners", () => {
    const appearance = { animation: { entrance: { type: "fade-up" as const } }, responsive: { mobile: { animation: { entrance: { type: "none" as const } } }, tablet: { animation: { entrance: { type: "scale-in" as const } } } } };
    expect(resolveAppearanceAnimation(appearance, "desktop")?.entrance?.type).toBe("fade-up");
    expect(resolveAppearanceAnimation(appearance, "tablet")?.entrance?.type).toBe("scale-in");
    expect(resolveAppearanceAnimation(appearance, "mobile")?.entrance?.type).toBe("none");
    expect(appearance.animation.entrance.type).toBe("fade-up");
  });

  it("is reused by every canonical block and Section appearance schema", () => {
    const animation = { entrance: { type: "fade" as const } };
    const elements = [
      { id: "text", type: "text", editorName: "Text 1", document: { type: "doc", children: [{ type: "paragraph", children: [{ text: "Copy" }] }] } },
      { id: "date", type: "date", editorName: "Date 1" },
      { id: "accordion", type: "accordion", editorName: "Accordion 1", items: [] },
      { id: "schedule", type: "schedule", editorName: "Schedule 1", items: [] },
      { id: "people", type: "people", editorName: "People 1", groups: [] },
      { id: "media", type: "media", editorName: "Media 1", items: [] },
      { id: "divider", type: "divider", editorName: "Divider 1" },
      { id: "group", type: "compositionGroup", editorName: "Group 1", children: [] },
    ];
    for (const element of elements) expect(websiteElementSchema.safeParse({ ...element, appearance: { animation, responsive: { mobile: { animation: { entrance: { type: "none" } } } } } }).success).toBe(true);
    const sectionBase = { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit", animation };
    expect(sectionAppearanceSchema.safeParse(sectionBase).success).toBe(true);
    expect(rsvpSectionAppearanceSchema.safeParse({ animation, specialized: { content: { animation } }, responsive: { mobile: { animation: { entrance: { type: "none" } } } } }).success).toBe(true);
  });

  it("renders final static markup and suppresses descendant execution under the highest animated ancestor", () => {
    const animation = { entrance: { type: "fade-up" as const } };
    const html = renderToStaticMarkup(<WebsiteMotionRuntime enabled sessionKey="session"><WebsiteMotion ownerId="parent" animation={animation}><WebsiteMotion ownerId="child" animation={animation}><button>RSVP</button></WebsiteMotion></WebsiteMotion></WebsiteMotionRuntime>);
    expect(html).toContain('data-motion-effect="fade-up"');
    expect(html.match(/data-motion-effect=/g)).toHaveLength(1);
    expect(html).not.toContain("opacity:0");
    expect(html).toContain("<button>RSVP</button>");
  });

  it("keeps Builder Edit in final state", () => {
    const html = renderToStaticMarkup(<WebsiteMotionRuntime enabled={false} sessionKey="edit"><WebsiteMotion ownerId="text" animation={{ entrance: { type: "fade" } }}><span>Edit me</span></WebsiteMotion></WebsiteMotionRuntime>);
    expect(html).not.toContain("data-motion-effect");
    expect(html).not.toContain("opacity:0");
  });
});
