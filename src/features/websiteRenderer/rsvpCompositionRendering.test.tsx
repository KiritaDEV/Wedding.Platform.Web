import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RsvpContent, WebsiteDraft, WebsiteSection } from "../websiteEditor/types";
import type { PrivateInvitationRendererRuntime } from "./privateInvitationRuntime";
import { WebsiteRenderer } from "./WebsiteRenderer";

const text = (id: string, value: string) => ({ id, type: "text" as const, editorName: `Text ${id}`, document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: value }] }] } });
const content: RsvpContent = {
  semantic: {},
  compositions: { shared: { childFlow: {
    elements: [
      text("before", "Before RSVP"),
      { id: "divider", type: "divider", editorName: "Private RSVP divider" },
      { id: "media", type: "media", editorName: "Private RSVP media", items: [] },
      { id: "group", type: "compositionGroup", editorName: "Private RSVP group", children: [text("group-text", "Private grouped RSVP copy")] },
      text("after", "After RSVP"),
    ],
    order: [{ kind: "element", id: "before" }, { kind: "element", id: "divider" }, { kind: "specialized", key: "content" }, { kind: "element", id: "media" }, { kind: "element", id: "group" }, { kind: "element", id: "after" }],
  } } },
};
const appearance = { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit" } as const;
const section = { id: "rsvp", type: "rsvp", displayName: "RSVP", editorName: null, sortOrder: 90, isEnabled: true, content, appearance, designDefaults: {}, resolvedDesignContext: null, appearanceOptions: null, mediaCapability: null, itemMediaCapability: null, presentationCapability: null } satisfies WebsiteSection;
const website = { schemaVersion: 5, id: "website", eventId: "event", name: "Website", templateKey: "classic-filipiniana-v1", designSettings: { colorTheme: "terracotta", fontSet: "editorial", artStyle: "clean", projectDefaults: {}, customColors: [] }, projectDesignDefaults: null, template: { key: "classic-filipiniana-v1", displayName: "Classic", designOptions: { colorThemes: [], fontSets: [], artStyles: [] }, capabilities: { globalDesign: { controls: [] }, designLibrary: { colors: [], fontFamilies: [], palettePresets: [], typographyPresets: [] }, projectDesignDefaults: { typography: { heading: { allowedFontIds: [] }, body: { allowedFontIds: [] } }, colors: { headingColor: { allowedColorIds: [] }, bodyColor: { allowedColorIds: [] }, accentColor: { allowedColorIds: [] } } }, projectColorLibrary: { enabled: true, maximum: 32, format: "opaqueHex" }, elementCapabilities: [], sections: [] } }, sections: [section], media: {} } as unknown as WebsiteDraft;
const event = { id: "event", name: "Event", type: "wedding" as const, eventDate: null };
const privateRuntime: PrivateInvitationRendererRuntime = {
  linkStatus: "current", invitationStatus: "active", trustState: "trusted", canOpen: false, opening: false, openError: false, accessBusy: false,
  onOpen: () => undefined, onRequestAccess: async () => undefined, onResolveAccess: async () => undefined, onSubmitRsvp: async () => { throw new Error("not invoked during rendering"); },
  rsvp: { status: "pending", attendingCount: 0, declinedCount: 0, pendingCount: 1, lastUpdated: null, availability: "open", guests: [{ id: "real", name: "Real Guest", response: null }] },
};

const render = (props: Partial<React.ComponentProps<typeof WebsiteRenderer>>) => renderToStaticMarkup(<WebsiteRenderer event={event} website={website} mode="public" targetViewport="desktop" {...props} />);

describe("RSVP authored composition audiences", () => {
  it("applies RSVP Section inner spacing around the complete composition", () => {
    const spacedWebsite = { ...website, sections: [{ ...section, appearance: { innerSpacing: { top: "xl", right: "s", bottom: "m", left: "xs" } } }] } as unknown as WebsiteDraft;
    const markup = renderToStaticMarkup(<WebsiteRenderer event={event} website={spacedWebsite} mode="editor" audience="management-preview" rsvpEditorPreviewState="form-partial" targetViewport="desktop" />);
    expect(markup).toContain('data-rsvp-foreground="true"');
    expect(markup).toContain("padding-top:2rem");
    expect(markup).toContain("padding-right:0.5rem");
    expect(markup).toContain("padding-bottom:1rem");
    expect(markup).toContain("padding-left:0.25rem");
    expect(markup.indexOf("Before RSVP")).toBeGreaterThan(markup.indexOf("data-rsvp-foreground"));
    expect(markup.indexOf("Juan Dela Cruz")).toBeGreaterThan(markup.indexOf("data-rsvp-foreground"));
  });

  it("omits the complete RSVP Section for the public audience", () => {
    const markup = render({ audience: "public-site" });
    expect(markup).not.toContain("Before RSVP");
    expect(markup).not.toContain("After RSVP");
    expect(markup).not.toContain("Private RSVP divider");
    expect(markup).not.toContain("Private RSVP media");
    expect(markup).not.toContain("Private grouped RSVP copy");
    expect(markup).not.toContain("data-rsvp-shared-presentation");
    expect(markup).not.toContain("data-rsvp-editor-preview");
    expect(markup).not.toContain("Real Guest");
    expect(markup).not.toContain('data-website-section="rsvp"');
  });

  it("hydrates the same slot with the Builder sample", () => {
    const markup = render({ audience: "management-preview", rsvpEditorPreviewState: "form-partial" });
    expect(markup.indexOf("Before RSVP")).toBeLessThan(markup.indexOf("Juan Dela Cruz"));
    expect(markup.indexOf("Juan Dela Cruz")).toBeLessThan(markup.indexOf("After RSVP"));
    expect(markup).not.toContain("Real Guest");
  });

  it("hydrates the same slot with only the private runtime", () => {
    const markup = render({ audience: "private-site", privateInvitationRuntime: privateRuntime });
    expect(markup.indexOf("Before RSVP")).toBeLessThan(markup.indexOf("Real Guest"));
    expect(markup.indexOf("Real Guest")).toBeLessThan(markup.indexOf("After RSVP"));
    expect(markup).not.toContain("Juan Dela Cruz");
  });
});
