import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import { PrivateInvitationRuntimeProvider } from "./PrivateInvitationRuntimeContext";
import { PrivateRsvpRuntime } from "./PrivateRsvpRuntime";
import type { PrivateInvitationRendererRuntime } from "./privateInvitationRuntime";
import { resolveRsvpPresentation, rsvpSubmitLabel } from "./rsvpPresentationResolution";

const library = {
  colors: [
    { id: "heading", displayName: "Heading", value: "#221711", roles: [] },
    { id: "body", displayName: "Body", value: "#493e38", roles: [] },
    { id: "accent", displayName: "Accent", value: "#8b4d36", roles: [] },
    { id: "contrast", displayName: "Contrast", value: "#ffffff", roles: [] },
  ],
  palettePresets: [{ id: "default", displayName: "Default", roles: { canvas: "body", surface: "body", text: "body", textMuted: "body", accent: "accent", accentContrast: "contrast", border: "body" } }],
} as unknown as TemplateDesignLibrary;
const context = { headingFontId: "playfair-display", bodyFontId: "inter", headingColorId: "heading", bodyColorId: "body", accentColorId: "accent" };

function runtime(guests: NonNullable<PrivateInvitationRendererRuntime["rsvp"]>["guests"] = [
  { id: "one", name: "Alexandria Very Long Santos Name That Must Wrap", response: null },
  { id: "two", name: "Aurora Dela Cruz", response: null },
]): PrivateInvitationRendererRuntime {
  return {
    linkStatus: "current", invitationStatus: "active", trustState: "trusted", canOpen: false,
    opening: false, openError: false, accessBusy: false,
    onOpen: () => undefined, onRequestAccess: async () => undefined, onResolveAccess: async () => undefined,
    onSubmitRsvp: async () => { throw new Error("Unexpected mutation"); },
    rsvp: { status: "pending", attendingCount: 0, declinedCount: 0, pendingCount: guests.length, lastUpdated: null, availability: "open", guests },
  };
}

function render(templateKey: string, viewport: "desktop" | "mobile" = "desktop", value = runtime(), authored?: import("../websitePresentation/rsvpThemePresentation").RsvpRuntimeAppearance): string {
  return renderToStaticMarkup(<PrivateInvitationRuntimeProvider value={value}><PrivateRsvpRuntime presentationEnvironment={{ templateKey, viewport, library, context, authored }}>Legacy preview</PrivateRsvpRuntime></PrivateInvitationRuntimeProvider>);
}

describe("shared RSVP functional presentation", () => {
  it("uses one shared renderer with distinct Classic and Modern Theme defaults", () => {
    const classic = render("classic-filipiniana-v1");
    const modern = render("modern-editorial-v1");
    expect(classic).toContain("data-rsvp-shared-presentation");
    expect(modern).toContain("data-rsvp-shared-presentation");
    expect(classic).toContain('data-rsvp-choice-layout="cards"');
    expect(modern).toContain('data-rsvp-choice-layout="segmented"');
    expect(classic).toContain("Playfair Display");
    expect(classic).toContain("#493e38");
  });

  it("renders semantic radio groups, explicit labels, selection cues, focus, and target sizing", () => {
    const value = runtime([
      { id: "one", name: "Alexandria Very Long Santos Name That Must Wrap", response: "attending" },
      { id: "two", name: "Aurora Dela Cruz", response: null },
    ]);
    value.rsvp = { ...value.rsvp!, status: "partial", attendingCount: 1, pendingCount: 1 };
    const markup = render("classic-filipiniana-v1", "desktop", value);
    expect(markup.match(/<fieldset/g)).toHaveLength(2);
    expect(markup.match(/type="radio"/g)).toHaveLength(4);
    expect(markup).toContain("Attending");
    expect(markup).toContain("Declined");
    expect(markup).not.toContain('value="pending"');
    expect(markup).toContain("focus-within:ring-2");
    expect(markup).toContain("min-h-11");
    expect(markup).toContain("lucide-check");
    expect(markup).toContain("[overflow-wrap:anywhere]");
    expect(markup).toContain("Partial");
    expect(markup).not.toContain("1 attending");
    expect(markup).not.toContain("1 pending");
  });

  it("applies independent selected and unselected Choice border widths", () => {
    const markup = render("classic-filipiniana-v1", "desktop", runtime([
      { id: "one", name: "Alex Santos", response: "attending" },
    ]), { choice: { selected: { borderWidth: "thick" }, unselected: { borderWidth: "none" } } });
    expect(markup).toMatch(/<label[^>]*style="[^"]*border-width:3px[^"]*"[^>]*data-rsvp-choice="attending"/);
    expect(markup).toMatch(/<label[^>]*style="[^"]*border-width:0[^"]*"[^>]*data-rsvp-choice="declined"/);
  });

  it("applies functional font minimums and mobile Choice/Action resolution", () => {
    const presentation = resolveRsvpPresentation({ templateKey: "classic-filipiniana-v1", viewport: "mobile", library, context });
    expect(presentation.responseLabel.fontSize).toBe("s");
    expect(presentation.choice.direction).toBe("column");
    expect(presentation.primaryAction.width).toBe("full");
    const markup = render("classic-filipiniana-v1", "mobile");
    expect(markup).toContain("flex-direction:column");
    expect(markup).toContain("w-full");
  });

  it("merges sparse authored roles over Theme defaults and exact responsive overrides", () => {
    const authored = {
      status: { fontSize: "3xl" as const, colorId: "accent" },
      guestName: { fontWeight: 700 as const },
      responseLabel: { textTransform: "lowercase" as const },
      supporting: { lineHeight: "tight" as const },
      choice: { radius: "pill" as const, responsive: { mobile: { direction: "column" as const, size: "compact" as const } } },
      action: { radius: "pill" as const, responsive: { mobile: { width: "full" as const, alignment: "end" as const } } },
    };
    const desktop = resolveRsvpPresentation({ templateKey: "modern-editorial-v1", viewport: "desktop", library, context, authored });
    const mobile = resolveRsvpPresentation({ templateKey: "modern-editorial-v1", viewport: "mobile", library, context, authored });
    expect(desktop.statusHeading).toMatchObject({ fontSize: "3xl", colorId: "accent", fontFamilyId: "playfair-display" });
    expect(desktop.guestName).toMatchObject({ fontWeight: 700, fontSize: "l" });
    expect(desktop.choice).toMatchObject({ layout: "segmented", radius: "pill", direction: "row" });
    expect(mobile.choice).toMatchObject({ radius: "pill", direction: "column", size: "compact" });
    expect(mobile.primaryAction).toMatchObject({ radius: "pill", width: "full", alignment: "end" });
    expect(authored).not.toHaveProperty("status.fontFamilyId");
    const markup = render("modern-editorial-v1", "mobile", runtime(), authored);
    expect(markup).toContain("font-size:4rem");
    expect(markup).toContain("border-radius:9999px");
    expect(markup).toContain("flex-direction:column");
    expect(markup).toContain("w-full");
  });

  it("resolves both Themes responsively without changing desktop defaults", () => {
    for (const templateKey of ["classic-filipiniana-v1", "modern-editorial-v1"]) {
      const mobile = resolveRsvpPresentation({ templateKey, viewport: "mobile", library, context });
      const desktop = resolveRsvpPresentation({ templateKey, viewport: "desktop", library, context });
      expect(mobile.choice.direction).toBe("column");
      expect(mobile.primaryAction).toMatchObject({ width: "full", size: "large" });
      expect(desktop.choice.direction).toBe("row");
      expect(desktop.primaryAction.width).toBe("intrinsic");
    }
  });

  it("renders a natural status heading and stacks long-name rows only on Mobile", () => {
    const pending = render("classic-filipiniana-v1", "mobile");
    expect(pending).toContain("Pending");
    expect(pending).not.toContain("0 attending");
    expect(pending).not.toContain("2 pending");
    expect(pending).not.toContain("data-rsvp-summary-layout");

    const complete = runtime([{ id: "one", name: "A Very Long Guest Name That Must Wrap Safely On Narrow Screens", response: "attending" }]);
    complete.rsvp = { ...complete.rsvp!, status: "complete", attendingCount: 1, pendingCount: 0, lastUpdated: "2026-09-24T10:00:00Z" };
    const mobileComplete = render("modern-editorial-v1", "mobile", complete);
    expect(mobileComplete).toContain("Complete");
    expect(mobileComplete).not.toContain("1 attending");
    expect(mobileComplete).not.toContain("0 pending");
    expect(mobileComplete).toContain("data-rsvp-summary-guest");
    expect(mobileComplete).toContain("flex-col items-start");
    expect(mobileComplete).toContain("[overflow-wrap:anywhere]");

    const desktopComplete = render("modern-editorial-v1", "desktop", complete);
    expect(desktopComplete).not.toContain("data-rsvp-summary-layout");
    expect(desktopComplete).not.toContain("flex-col items-start");
  });

  it("falls back safely for an unknown Theme", () => {
    const markup = render("unknown-template");
    expect(markup).toContain("data-rsvp-shared-presentation");
    expect(markup).toContain('data-rsvp-choice-layout="cards"');
  });

  it("renders an explicit empty roster without a form or mutation action", () => {
    const markup = render("classic-filipiniana-v1", "desktop", runtime([]));
    expect(markup).toContain("No active Guests are available for RSVP.");
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain("Submit RSVP");
    expect(markup).not.toContain('type="radio"');
  });

  it("owns initial and completed-edit action labels", () => {
    expect(rsvpSubmitLabel(false)).toBe("Submit RSVP");
    expect(rsvpSubmitLabel(true)).toBe("Save changes");
  });
});
