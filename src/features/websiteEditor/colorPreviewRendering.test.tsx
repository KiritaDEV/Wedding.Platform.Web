import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ColorPreviewContext, createColorPreviewStore, scopedColorPreviewTarget } from "./colorPreview";
import { WebsiteLeafElementRenderer } from "../websiteRenderer/WebsiteLeafElementRenderer";
import type { WebsiteLeafElement } from "../websiteElements/types";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import { RsvpEditorPreview } from "../websiteRenderer/RsvpEditorPreviewRenderer";
import { WebsiteRenderer } from "../websiteRenderer/WebsiteRenderer";
import type { WebsiteDraft } from "./types";

// Exercise the client snapshot while rendering the real dispatch/render tree.
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot() }));
const library = { colors: [{ id: "accent", displayName: "Accent", value: "#123456" }], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] } as unknown as TemplateDesignLibrary;
const context = { headingFontId: "", bodyFontId: "", headingColorId: "accent", bodyColorId: "accent", accentColorId: "accent" };
const elements: Extract<WebsiteLeafElement, { type: "divider" | "text" | "text" | "date" }>[] = [
  { id: "same", editorName: "Divider 1", type: "divider" },
  { id: "same", editorName: "Text 1", type: "text", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Rich text" }] }] } },
  { id: "same", editorName: "Date 1", type: "date" },
];
it.each(elements.flatMap((element) => [undefined, "accent", "project-color-existing"].map((colorId) => ({ ...element, appearance: { colorId } }))))("$type previews only the targeted editor Section, preserves public output, and restores canonical geometry", (element) => {
  const store = createColorPreviewStore();
  const render = (mode: "editor" | "public", sectionId = "section") => renderToStaticMarkup(<ColorPreviewContext value={store}><WebsiteLeafElementRenderer element={element} eventDate="2026-12-22" mode={mode} sectionId={sectionId} viewport="desktop" templateKey="classic-filipiniana-v1" library={library} projectColors={[{ id: "project-color-existing", value: "#FEDCBA" }]} context={context} /></ColorPreviewContext>);
  const saved = JSON.stringify(element);
  const before = render("editor");
  const publicBefore = render("public");
  const session = store.begin(scopedColorPreviewTarget("section", "same:color"));
  session.update("#ABCDEF");
  expect(render("editor").replaceAll("#ABCDEF", element.appearance.colorId === "project-color-existing" ? "#FEDCBA" : "#123456")).toBe(before);
  expect(render("editor")).toContain("#ABCDEF");
  expect(render("editor", "another-section")).not.toContain("#ABCDEF");
  expect(render("public")).toBe(publicBefore);
  expect(JSON.stringify(element)).toBe(saved);
  session.clear();
  expect(render("editor")).toBe(before);
});

it.each([["textShadowColor", "textShadow"], ["glowColor", "glow"]] as const)("previews %s independently without mutating Text or public output", (target, effect) => {
  const element: Extract<WebsiteLeafElement, { type: "text" }> = { id: "same", editorName: "Text 1", type: "text", document: { type: "doc", children: [{ type: "paragraph", children: [{ text: "Neil " }, { text: "&", colorId: "accent" }, { text: " Hazel" }] }] }, appearance: { [effect]: "soft", [`${effect}ColorId`]: "project-color-existing" } };
  const store = createColorPreviewStore();
  const render = (mode: "editor" | "public") => renderToStaticMarkup(<ColorPreviewContext value={store}><WebsiteLeafElementRenderer element={element} mode={mode} sectionId="section" viewport="desktop" templateKey="classic-filipiniana-v1" library={library} projectColors={[{ id: "project-color-existing", value: "#FEDCBA" }]} context={context} /></ColorPreviewContext>);
  const publicBefore = render("public");
  const session = store.begin(scopedColorPreviewTarget("section", `same:${target}`));
  session.update("#ABCDEF");
  expect(render("editor")).toContain("#ABCDEF");
  expect(render("editor")).toContain('<span style="color:#123456">&amp;</span>');
  expect(render("public")).toBe(publicBefore);
  session.clear();
  expect(render("editor")).not.toContain("#ABCDEF");
});

it.each([
  ["rsvp:status:color", "color:#abcdef"],
  ["rsvp:choice:selected:background-color", "background-color:#abcdef"],
  ["rsvp:action:background-color", "background-color:#abcdef"],
] as const)("previews RSVP %s before a custom color is committed", (target, expectedStyle) => {
  const store = createColorPreviewStore();
  const render = (editor: boolean) => renderToStaticMarkup(<ColorPreviewContext value={store}><RsvpEditorPreview state="form-partial" environment={{ sectionId: "rsvp-section", editor, templateKey: "classic-filipiniana-v1", viewport: "desktop", library, context }} /></ColorPreviewContext>);
  const publicBefore = render(false);
  const session = store.begin(scopedColorPreviewTarget("rsvp-section", target));
  session.update("#ABCDEF");
  expect(render(true).toLowerCase()).toContain(expectedStyle);
  expect(render(false)).toBe(publicBefore);
  session.clear();
  expect(render(true).toLowerCase()).not.toContain(expectedStyle);
});

it.each(["classic-filipiniana-v1", "modern-editorial-v1"] as const)("previews %s Section background before commit without changing public output", (templateKey) => {
  const store = createColorPreviewStore();
  const section = { id: "rsvp-section", type: "rsvp", displayName: "RSVP", editorName: null, sortOrder: 90, isEnabled: true, content: { semantic: {}, compositions: { shared: { childFlow: { elements: [], order: [{ kind: "specialized", key: "content" }] } } } }, appearance: {}, designDefaults: {}, resolvedDesignContext: null, appearanceOptions: null, mediaCapability: null, itemMediaCapability: null, presentationCapability: null };
  const website = { schemaVersion: 5, id: "website", eventId: "event", name: "Website", templateKey, designSettings: { colorTheme: templateKey === "classic-filipiniana-v1" ? "terracotta" : "ink", fontSet: "editorial", artStyle: "clean", projectDefaults: {}, customColors: [] }, projectDesignDefaults: null, template: { key: templateKey, displayName: "Template", designOptions: { colorThemes: [], fontSets: [], artStyles: [] }, capabilities: { globalDesign: { controls: [] }, designLibrary: library, projectDesignDefaults: { typography: { heading: { allowedFontIds: [] }, body: { allowedFontIds: [] } }, colors: { headingColor: { allowedColorIds: [] }, bodyColor: { allowedColorIds: [] }, accentColor: { allowedColorIds: [] } } }, projectColorLibrary: { enabled: true, maximum: 32, format: "opaqueHex" }, elementCapabilities: [], sections: [] } }, sections: [section], media: {} } as unknown as WebsiteDraft;
  const event = { id: "event", name: "Event", type: "wedding" as const, eventDate: null };
  const render = (mode: "editor" | "public") => renderToStaticMarkup(<ColorPreviewContext value={store}><WebsiteRenderer event={event} website={website} mode={mode} targetViewport="desktop" /></ColorPreviewContext>);
  const publicBefore = render("public");
  const session = store.begin(scopedColorPreviewTarget("rsvp-section", "backgroundColor"));
  session.update("#ABCDEF");
  expect(render("editor").toLowerCase()).toContain("background-color:#abcdef");
  expect(render("public")).toBe(publicBefore);
  session.clear();
  expect(render("editor").toLowerCase()).not.toContain("background-color:#abcdef");
});
