import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { TemplateDesignLibrary } from "../../websiteCapabilities/types";
import { resolveRsvpPresentation } from "../../websiteRenderer/rsvpPresentationResolution";
import { updateActionColor, updateChoiceColor, updateRuntimeTextColor, updateRuntimeTextEffect } from "../rsvpAppearanceUpdates";
import { RsvpRuntimeAppearanceEditor } from "./RsvpRuntimeAppearanceEditor";

const library = {
  colors: [{ id: "body", displayName: "Body", value: "#222222", roles: [] }, { id: "accent", displayName: "Accent", value: "#884422", roles: [] }],
  fontFamilies: [{ id: "inter", displayName: "Inter", family: "Inter", category: "sans-serif", weights: [400, 600, 700], italic: true, allowedRoles: ["body", "heading"] }],
  fontRecommendations: { body: ["inter"], heading: ["inter"] },
  palettePresets: [], typographyPresets: [],
} as unknown as TemplateDesignLibrary;

describe("RSVP runtime Appearance inspector", () => {
  it("exposes appearance roles and controls without operational content editing", () => {
    const html = renderToStaticMarkup(<RsvpRuntimeAppearanceEditor
      value={{}}
      resolved={resolveRsvpPresentation({ templateKey: "classic-filipiniana-v1", viewport: "mobile", library })}
      viewport="mobile"
      library={library}
      allowedFontIds={["inter"]}
      allowedColorIds={["body", "accent"]}
      projectColors={[]}
      onAddColor={vi.fn()}
      onChange={vi.fn()}
    />);
    for (const label of ["Runtime text", "Status", "Guest names", "Response labels", "Supporting text", "Choices", "Actions", "Choice direction", "Action width"]) expect(html).toContain(label);
    expect(html).not.toContain("Alex Santos");
    expect(html).not.toContain("Submit RSVP");
    expect(html).not.toContain("textarea");
    expect(html).toContain("data-rsvp-runtime-appearance-editor");
  });

  it("visibly labels every Choice and Action color field with a distinct accessible name", () => {
    const html = renderToStaticMarkup(<RsvpRuntimeAppearanceEditor
      value={{}}
      resolved={resolveRsvpPresentation({ templateKey: "classic-filipiniana-v1", viewport: "desktop", library })}
      viewport="desktop"
      library={library}
      allowedFontIds={["inter"]}
      allowedColorIds={["body", "accent"]}
      projectColors={[]}
      onAddColor={vi.fn()}
      onChange={vi.fn()}
    />);
    for (const group of ["Selected", "Unselected", "Colors"]) expect(html).toContain(`>${group}<`);
    expect(html.match(/>Text color</g)).toHaveLength(8);
    expect(html.match(/>Background color</g)).toHaveLength(3);
    expect(html.match(/>Border color</g)).toHaveLength(3);
    for (const name of [
      "Selected text color", "Selected background color", "Selected border color",
      "Unselected text color", "Unselected background color", "Unselected border color",
      "Action text color", "Action background color", "Action border color",
    ]) expect(html).toContain(`role="radiogroup" aria-label="${name}"`);
  });

  it("maps each labeled color field to its existing sparse appearance property", () => {
    for (const state of ["selected", "unselected"] as const) for (const key of ["textColorId", "backgroundColorId", "borderColorId"] as const) {
      expect(updateChoiceColor({}, state, key, "accent")).toEqual({ [state]: { [key]: "accent" } });
    }
    for (const key of ["textColorId", "backgroundColorId", "borderColorId"] as const) {
      expect(updateActionColor({}, key, "accent")).toEqual({ [key]: "accent" });
    }
    expect(updateChoiceColor({ selected: { textColorId: "accent" } }, "selected", "textColorId", undefined)).toEqual({});
    expect(updateActionColor({ textColorId: "accent" }, "textColorId", undefined)).toEqual({});
  });

  it("labels runtime text colors for every role and only shows active effect colors", () => {
    const roles = ["Status", "Guest names", "Response labels", "Supporting text"];
    const html = renderToStaticMarkup(<RsvpRuntimeAppearanceEditor
      value={{
        status: { textShadow: "soft", glow: "strong" },
        guestName: { textShadow: "soft", glow: "strong" },
        responseLabel: { textShadow: "soft", glow: "strong" },
        supporting: { textShadow: "soft", glow: "strong" },
      }}
      resolved={resolveRsvpPresentation({ templateKey: "classic-filipiniana-v1", viewport: "desktop", library })}
      viewport="desktop"
      library={library}
      allowedFontIds={["inter"]}
      allowedColorIds={["body", "accent"]}
      projectColors={[]}
      onAddColor={vi.fn()}
      onChange={vi.fn()}
    />);
    expect(html.match(/>Text color</g)).toHaveLength(8);
    expect(html.match(/>Shadow color</g)).toHaveLength(4);
    expect(html.match(/>Glow color</g)).toHaveLength(4);
    for (const role of roles) for (const field of ["text color", "shadow color", "glow color"]) {
      expect(html).toContain(`role="radiogroup" aria-label="${role} ${field}"`);
    }

    const inactiveHtml = renderToStaticMarkup(<RsvpRuntimeAppearanceEditor
      value={{}}
      resolved={resolveRsvpPresentation({ templateKey: "classic-filipiniana-v1", viewport: "desktop", library })}
      viewport="desktop"
      library={library}
      allowedFontIds={["inter"]}
      allowedColorIds={["body", "accent"]}
      projectColors={[]}
      onAddColor={vi.fn()}
      onChange={vi.fn()}
    />);
    for (const role of roles) {
      expect(inactiveHtml).toContain(`role="radiogroup" aria-label="${role} text color"`);
      expect(inactiveHtml).not.toContain(`role="radiogroup" aria-label="${role} shadow color"`);
      expect(inactiveHtml).not.toContain(`role="radiogroup" aria-label="${role} glow color"`);
    }
  });

  it("maps and clears all runtime text color properties without leaving inactive effect colors", () => {
    for (const key of ["colorId", "textShadowColorId", "glowColorId"] as const) {
      expect(updateRuntimeTextColor({}, key, "accent")).toEqual({ [key]: "accent" });
      expect(updateRuntimeTextColor({ [key]: "accent" }, key, undefined)).toEqual({});
    }
    expect(updateRuntimeTextEffect({ textShadow: "soft", textShadowColorId: "accent", glow: "strong", glowColorId: "body" }, "textShadow", "none")).toEqual({ textShadow: "none", glow: "strong", glowColorId: "body" });
    expect(updateRuntimeTextEffect({ glow: "strong", glowColorId: "accent" }, "glow", "none")).toEqual({ glow: "none" });
  });

  it("uses the canonical Text formatting-button design for every runtime typography role", () => {
    const html = renderToStaticMarkup(<RsvpRuntimeAppearanceEditor
      value={{ status: { italic: true }, guestName: { underline: true }, responseLabel: { strikethrough: true } }}
      resolved={resolveRsvpPresentation({ templateKey: "classic-filipiniana-v1", viewport: "desktop", library })}
      viewport="desktop"
      library={library}
      allowedFontIds={["inter"]}
      allowedColorIds={["body", "accent"]}
      projectColors={[]}
      onAddColor={vi.fn()}
      onChange={vi.fn()}
    />);
    for (const role of ["Status", "Guest names", "Response labels", "Supporting text", "Action typography"]) {
      for (const format of ["italic", "underline", "strikethrough"]) expect(html).toContain(`aria-label="${role} ${format}"`);
    }
    expect(html).toMatch(/aria-label="Status italic"[^>]*aria-pressed="true"/);
    expect(html).toMatch(/aria-label="Guest names underline"[^>]*aria-pressed="true"/);
    expect(html).toMatch(/aria-label="Response labels strikethrough"[^>]*aria-pressed="true"/);
    expect(html).not.toContain('type="checkbox"');
    expect(html).toContain("lucide-italic");
    expect(html).toContain("lucide-underline");
    expect(html).toContain("lucide-strikethrough");
  });

  it("uses canonical human-readable Text font-weight options for every runtime typography role", () => {
    const html = renderToStaticMarkup(<RsvpRuntimeAppearanceEditor
      value={{}}
      resolved={resolveRsvpPresentation({ templateKey: "classic-filipiniana-v1", viewport: "desktop", library, context: { headingFontId: "inter", bodyFontId: "inter", headingColorId: "body", bodyColorId: "body", accentColorId: "accent" } })}
      viewport="desktop"
      library={library}
      allowedFontIds={["inter"]}
      allowedColorIds={["body", "accent"]}
      projectColors={[]}
      onAddColor={vi.fn()}
      onChange={vi.fn()}
    />);
    const expected = { Status: "Semi-bold", "Guest names": "Semi-bold", "Response labels": "Semi-bold", "Supporting text": "Normal", "Action typography": "Semi-bold" };
    for (const [role, label] of Object.entries(expected)) {
      const control = html.match(new RegExp(`aria-label="${role} font weight"[\\s\\S]*?</button>`))?.[0] ?? "";
      expect(control).toContain(`>${label}<`);
      expect(control).not.toMatch(/>400<|>600<|>700</);
    }
  });
});
