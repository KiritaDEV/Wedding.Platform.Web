import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { WebsiteElement } from "../websiteElements/types";
import type { WebsiteSectionAppearanceEnvelope } from "../websiteEditor/types";
import { AnimationAppearanceControls } from "../websiteEditor/components/AnimationAppearanceControls";
import { ANIMATION_DELAY_OPTIONS, ANIMATION_EFFECT_OPTIONS, ANIMATION_SPEED_OPTIONS, animatedElementAncestor, animationSummary, authoredElementAnimation, updateAuthoredAnimation, updateElementAnimation } from "./authoring";
import { ANIMATION_DELAYS, ANIMATION_SPEEDS, ENTRANCE_ANIMATION_TYPES } from "./contract";
import { resolveElementAnimation, resolveSectionAnimation } from "./resolve";
import { elementMotionOwnerId, rsvpMotionOwnerId, sectionMotionOwnerId } from "./identity";

const text = { id: "text", type: "text", editorName: "Text 1", document: { type: "doc", children: [{ type: "paragraph", children: [{ text: "Copy" }] }] } } as WebsiteElement;

describe("animation authoring", () => {
  it("uses one canonical replay identity for every owner family", () => {
    expect(sectionMotionOwnerId("hero")).toBe("section:hero");
    for (const id of ["text", "date", "accordion", "schedule", "people", "media", "divider", "group"])
      expect(elementMotionOwnerId(id)).toBe(`element:${id}`);
    expect(rsvpMotionOwnerId("rsvp")).toBe("specialized:rsvp:rsvp-form");
  });
  it.each(ENTRANCE_ANIMATION_TYPES)("authors the canonical %s effect", (type) => {
    expect(updateAuthoredAnimation(undefined, { type }, true)?.entrance?.type).toBe(type);
  });

  it.each(ANIMATION_SPEEDS)("maps %s speed sparsely", (speed) => {
    const animation = updateAuthoredAnimation({ entrance: { type: "fade" } }, { speed });
    expect(animation?.entrance?.speed).toBe(speed === "normal" ? undefined : speed);
  });

  it.each(ANIMATION_DELAYS)("maps %s delay sparsely", (delay) => {
    const animation = updateAuthoredAnimation({ entrance: { type: "fade" } }, { delay });
    expect(animation?.entrance?.delay).toBe(delay === "none" ? undefined : delay);
  });

  it("distinguishes base None from exact-device None and reset", () => {
    expect(updateAuthoredAnimation({ entrance: { type: "fade-up" } }, { type: "none" })).toBeUndefined();
    expect(updateAuthoredAnimation({ entrance: { type: "fade-up" } }, { type: "none" }, true)).toEqual({ entrance: { type: "none" } });
    const mobileNone = updateElementAnimation(text, "mobile", { entrance: { type: "none" } });
    expect(authoredElementAnimation(mobileNone, "mobile")?.entrance?.type).toBe("none");
    expect(resolveElementAnimation(mobileNone, "desktop")).toBeUndefined();
    const reset = updateElementAnimation(mobileNone, "mobile", undefined);
    expect(authoredElementAnimation(reset, "mobile")).toBeUndefined();
    expect("appearance" in reset).toBe(false);
  });

  it("preserves unrelated responsive appearance while resetting only animation", () => {
    const element = { ...text, appearance: { animation: { entrance: { type: "fade-up" as const } }, responsive: { mobile: { fontSize: "l", animation: { entrance: { type: "none" as const } } } } } } as WebsiteElement;
    const reset = updateElementAnimation(element, "mobile", undefined) as WebsiteElement & { appearance: { responsive: { mobile: object } } };
    expect(reset.appearance.responsive.mobile).toEqual({ fontSize: "l" });
    expect(resolveElementAnimation(reset, "mobile")?.entrance?.type).toBe("fade-up");
  });

  it("resolves Section shared, exact-device, and explicit None ownership", () => {
    const envelope: WebsiteSectionAppearanceEnvelope = {
      shared: { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit", animation: { entrance: { type: "fade-up" as const } } },
      custom: { tablet: { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit" }, mobile: { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit", animation: { entrance: { type: "none" as const } } } },
    };
    expect(resolveSectionAnimation(envelope, "desktop")?.entrance?.type).toBe("fade-up");
    expect(resolveSectionAnimation(envelope, "tablet")?.entrance?.type).toBe("fade-up");
    expect(resolveSectionAnimation(envelope, "mobile")?.entrance?.type).toBe("none");
  });

  it("renders the compact collapsed disclosure with an effective summary", () => {
    const html = renderToStaticMarkup(<AnimationAppearanceControls ownerLabel="Text" effective={{ entrance: { type: "fade-up", speed: "slow", delay: "short" } }} onChange={vi.fn()} onReplay={vi.fn()} />);
    expect(html).toContain("Animation");
    expect(html).toContain("Fade up · Slow · Short delay");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("animation effect");
  });

  it("summarizes defaults without materializing them", () => {
    expect(animationSummary({ entrance: { type: "fade" } })).toBe("Fade");
    expect(animationSummary(undefined)).toBe("None");
  });

  it("maps human labels to every canonical token", () => {
    expect(ANIMATION_EFFECT_OPTIONS).toEqual([
      { value: "none", label: "None" }, { value: "fade", label: "Fade" }, { value: "fade-up", label: "Fade up" }, { value: "fade-down", label: "Fade down" }, { value: "scale-in", label: "Scale in" },
    ]);
    expect(ANIMATION_SPEED_OPTIONS.map(option => option.label)).toEqual(["Fast", "Normal", "Slow"]);
    expect(ANIMATION_DELAY_OPTIONS.map(option => option.label)).toEqual(["No delay", "Short", "Medium", "Long"]);
  });

  it("detects the highest effective animated Group ancestor without deleting child data", () => {
    const leaf = { ...text, id: "leaf", appearance: { animation: { entrance: { type: "fade" as const } } } } as WebsiteElement;
    const nested = { id: "nested", type: "compositionGroup", editorName: "Nested", children: [leaf], appearance: { animation: { entrance: { type: "scale-in" as const } } } } as WebsiteElement;
    const outer = { id: "outer", type: "compositionGroup", editorName: "Outer", children: [nested], appearance: { animation: { entrance: { type: "fade-up" as const } }, responsive: { mobile: { animation: { entrance: { type: "none" as const } } } } } } as WebsiteElement;
    const flow = { order: [{ kind: "element" as const, id: "outer" }], elements: [outer] };
    expect(animatedElementAncestor(flow, "leaf", "desktop")?.id).toBe("outer");
    expect(animatedElementAncestor(flow, "leaf", "mobile")?.id).toBe("nested");
    expect(resolveElementAnimation(leaf, "desktop")?.entrance?.type).toBe("fade");
  });
});
