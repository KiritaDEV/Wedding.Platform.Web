import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { WebsiteDraft, WebsiteSection } from "../websiteEditor/types";
import { ClassicFilipinianaRenderer } from "./templates/ClassicFilipinianaRenderer";
import { ModernEditorialRenderer } from "./templates/ModernEditorialRenderer";

const event = { id: "event", name: "Alex & Sam", eventDate: "2027-01-02", type: "wedding" as const };
const appearance = {
  headingAlignment: "inherit" as const,
  bodyAlignment: "inherit" as const,
  backgroundTreatment: "inherit" as const,
  emphasis: "inherit" as const,
};
const resolvedMedia = {
  image: {
    id: "image",
    originalFilename: "hero.jpg",
    width: 1600,
    height: 1200,
    web: { width: 1200, height: 900, url: "/hero.jpg" },
  },
  "background-tablet": { id: "background-tablet", originalFilename: "tablet.jpg", width: 1200, height: 900, web: { width: 1200, height: 900, url: "/tablet.jpg" } },
  "background-mobile": { id: "background-mobile", originalFilename: "mobile.jpg", width: 900, height: 1200, web: { width: 900, height: 1200, url: "/mobile.jpg" } },
};

function section(type: string, id = type, content: Record<string, unknown> = {}): WebsiteSection {
  const canonicalContent = "semantic" in content ? content : type === "hero"
    ? { semantic: {}, compositions: { shared: { childFlow: content.childFlow } } }
    : type === "blank" ? { semantic: {}, compositions: { shared: { childFlow: content.childFlow } } }
    : { semantic: content };
  return {
    id,
    type,
    displayName: type,
    sortOrder: 10,
    isEnabled: true,
    content: canonicalContent,
    appearance: type === "hero" && content.backgroundMedia ? { ...appearance, backgroundMedia: content.backgroundMedia } : appearance,
    designDefaults: {},
    resolvedDesignContext: null,
    appearanceOptions: null,
    mediaCapability: null,
    itemMediaCapability: null,
    presentationCapability: null,
  } as WebsiteSection;
}

function draft(templateKey: "classic-filipiniana-v1" | "modern-editorial-v1", sections: WebsiteSection[]): WebsiteDraft {
  return {
    schemaVersion: 5,
    id: "website",
    eventId: event.id,
    name: "Website",
    templateKey,
    designSettings: { colorTheme: templateKey.startsWith("classic") ? "terracotta" : "ink", fontSet: "editorial", artStyle: "clean", projectDefaults: {}, customColors: [] },
    projectDesignDefaults: null,
    template: {
      key: templateKey,
      displayName: templateKey,
      designOptions: { colorThemes: [], fontSets: [], artStyles: [] },
      capabilities: { sections: [], elementCapabilities: [], designLibrary: { colors: [], fontFamilies: [], palettePresets: [], typographyPresets: [] } },
    },
    sections,
    media: resolvedMedia,
  } as unknown as WebsiteDraft;
}

function render(template: "classic" | "modern", sections: WebsiteSection[], viewport: "desktop" | "tablet" | "mobile" = "desktop", mode: "editor" | "public" = "public") {
  const templateKey = template === "classic" ? "classic-filipiniana-v1" : "modern-editorial-v1";
  const Renderer = template === "classic" ? ClassicFilipinianaRenderer : ModernEditorialRenderer;
  return renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, sections)} targetViewport={viewport} mode={mode} />);
}

function hero(height: number | null = 100): WebsiteSection {
  return {
    ...section("hero", "hero", { backgroundMedia: { assetId: "image" }, childFlow: { elements: [{ id: "text", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Alex & Sam"  }] }] }}], order: [{ kind: "element", id: "text" }] } }),
    appearance: { ...appearance, backgroundMedia: { assetId: "image" }, ...(height === null ? {} : { height: { unit: "svh" as const, value: height } }) },
    mediaCapability: { mode: "single" },
    presentationCapability: null,
  } as WebsiteSection;
}

describe("Section renderer boundary", () => {
  it.each(["classic", "modern"] as const)("resolves %s Hero composition independently while retaining semantic media", (template) => {
    const value = hero();
    const content = value.content as import("../websiteEditor/types").HeroContent;
    const custom = (id: string, text: string) => ({ childFlow: { elements: [{ id, type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text }] }] } }], order: [{ kind: "element" as const, id }] } });
    content.compositions.custom = { desktop: custom("desktop", "Desktop Hero"), mobile: custom("mobile", "Mobile Hero") };
    const desktop = render(template, [value], "desktop");
    const tablet = render(template, [value], "tablet");
    const mobile = render(template, [value], "mobile");
    expect(desktop).toContain("Desktop Hero");
    expect(tablet).toContain("Alex &amp; Sam");
    expect(tablet).not.toContain("Desktop Hero");
    expect(mobile).toContain("Mobile Hero");
    expect(desktop).toContain("data-hero-background-image");
    expect(mobile).toContain("data-hero-background-image");
  });
  it.each(["classic", "modern"] as const)("keeps the %s surface and ordinary content boundary free of Section padding", (template) => {
    const markup = render(template, [section("rsvp", "rsvp", { heading: "RSVP", description: "Join us", buttonLabel: "Reply" })]);
    expect(markup).toContain('data-preview-section="rsvp"');
    expect(markup).toContain("data-section-surface");
    expect(markup).toContain("data-section-content-inset");
    const boundaryClass = markup.match(/data-section-content-inset="true" class="([^"]*)"/)?.[1] ?? "";
    expect(boundaryClass).not.toMatch(/(?:^|\s)(?:p|px|py|pt|pr|pb|pl)-/);
  });

  it.each(["gallery", "rsvp"] as const)("hosts %s decoration on the outer Section surface in both renderers", (type) => {
    const content = type === "gallery"
      ? { heading: "Gallery", items: [] }
      : { heading: "RSVP", description: "Join us", buttonLabel: "Reply" };
    for (const template of ["classic", "modern"] as const) {
      const value = section(type, type, content);
      value.appearance = { ...appearance, decorativeAppearance: { background: { overlay: "soft" }, frame: { style: "fine" } } };
      const markup = render(template, [value], "mobile", "editor");
      expect(markup).toContain("relative isolate");
      expect(markup).toContain("data-section-decoration");
      expect(markup).toContain('data-section-foreground="true" class="relative z-10"');
      expect(markup).toContain("z-[4]");
      expect(markup).toContain("z-[20]");
      expect(markup).toContain("pointer-events-none absolute inset-0 overflow-hidden");
      expect(markup).toContain('aria-hidden="true"');
      expect(markup.indexOf("data-section-decoration")).toBeLessThan(markup.indexOf("data-section-content-inset"));
    }
  });

  it.each(["desktop", "tablet", "mobile"] as const)("keeps Hero Frame on the full-bleed shell at %s", (viewport) => {
    const value = hero();
    value.appearance = { ...(value.appearance as WebsiteSection["appearance"]), decorativeAppearance: { frame: { style: "fine" } } } as WebsiteSection["appearance"];
    const markup = render("classic", [value], viewport, "editor");
    expect(markup.indexOf("data-section-full-bleed")).toBeLessThan(markup.indexOf('data-section-decoration-phase="frame"'));
    expect(markup.indexOf("data-hero-foreground")).toBeLessThan(markup.indexOf('data-section-decoration-phase="frame"'));
    expect(markup).not.toContain("data-section-content-inset");
  });

  it.each(["classic", "modern"] as const)("keeps %s immersive Hero media outside the ordinary content inset", (template) => {
    const markup = render(template, [hero()]);
    expect(markup).toContain("data-section-full-bleed");
    expect(markup).toContain("data-hero-background-image");
    expect(markup).toContain("data-hero-foreground");
    expect(markup).not.toContain("data-section-content-inset");
    expect(markup.indexOf("data-section-full-bleed")).toBeLessThan(markup.indexOf("data-hero-foreground"));
  });

  it.each(["classic", "modern"] as const)("lets a zero-spacing full-width root Group reach every %s Hero edge in editor and public", (template) => {
    const value = hero();
    const group = {
      id: "edge-group",
      type: "compositionGroup" as const,
      editorName: "Group 1",
      children: [{ id: "edge-text", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Edge content"  }] }] }}],
      layout: { width: "full" as const, gap: "none" as const, padding: { top: "none" as const, right: "none" as const, bottom: "none" as const, left: "none" as const } },
    };
    value.content = { semantic: {}, compositions: { shared: { childFlow: { elements: [group], order: [{ kind: "element", id: group.id }] } } } };

    for (const viewport of ["desktop", "tablet", "mobile"] as const) {
      for (const mode of ["editor", "public"] as const) {
        const markup = render(template, [value], viewport, mode);
        const foregroundClass = markup.match(/data-hero-foreground="true" class="([^"]*)"/)?.[1] ?? "";
        expect(foregroundClass).not.toMatch(/(?:^|\s)(?:p|px|py|pt|pr|pb|pl)-/);
        expect(markup).toContain('data-section-root-flow="true"');
        expect(markup).toMatch(/data-website-element="group"[^>]*style="[^"]*padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;[^"]*width:100%;max-width:100%/);
      }
    }
  });

  it.each(["classic", "modern"] as const)("keeps authored Group padding as the %s Hero inset owner", (template) => {
    const value = hero();
    const group = {
      id: "inset-group",
      type: "compositionGroup" as const,
      editorName: "Group 1",
      children: [{ id: "inset-text", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Inset content"  }] }] }}],
      layout: { width: "full" as const, padding: { top: "l" as const, right: "m" as const, bottom: "s" as const, left: "xl" as const } },
    };
    value.content = { semantic: {}, compositions: { shared: { childFlow: { elements: [group], order: [{ kind: "element", id: group.id }] } } } };

    for (const mode of ["editor", "public"] as const) {
      const markup = render(template, [value], "mobile", mode);
      expect(markup).toMatch(/data-website-element="group"[^>]*style="[^"]*padding-top:1\.5rem;padding-right:1rem;padding-bottom:0\.5rem;padding-left:2rem/);
    }
  });

  it.each(["classic", "modern"] as const)("uses shared %s Section decorations for Blank in editor and public output", (template) => {
    const value = section("blank", "blank", { childFlow: { elements: [], order: [] } });
    value.appearance = {
      ...appearance,
      backgroundTreatment: "custom",
      decorativeAppearance: {
        background: { customColor: "#123456", texture: "paper", pattern: "botanical", overlay: "soft" },
        frame: { style: "fine" },
      },
    };
    for (const mode of ["editor", "public"] as const) {
      const markup = render(template, [value], "desktop", mode);
      expect(markup).toContain("data-section-decoration");
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain("background-color:#123456");
    }
  });

  it.each(["classic", "modern"] as const)("uses authored safe viewport minimum height for %s Hero on every semantic viewport", (template) => {
    for (const viewport of ["desktop", "tablet", "mobile"] as const) {
      const markup = render(template, [hero()], viewport);
      expect(markup).toContain("min-height:100svh");
    }
  });

  it.each(["classic", "modern"] as const)("does not make %s automatic Hero viewport-height", (template) => {
    const markup = render(template, [hero(null)]);
    expect(markup).not.toContain("min-height:");
  });

  it.each(["classic", "modern"] as const)("keeps %s authored minimum height without resolved background media", (template) => {
    const value = hero();
    value.appearance = { ...appearance, height: { unit: "svh", value: 100 } };
    const markup = render(template, [value]);
    expect(markup).toContain("data-hero-shell");
    expect(markup).toContain("min-height:100svh");
    expect(markup).not.toContain("data-hero-background-image");
  });

  it.each(["classic", "modern"] as const)("publishes an otherwise empty %s Hero only when it has an authored minimum height", (template) => {
    const value = hero(null);
    value.content = { semantic: {}, compositions: { shared: { childFlow: { elements: [], order: [] } } } };
    value.appearance = { ...appearance };
    expect(render(template, [value])).not.toContain('data-hero-shell="true"');
    value.appearance = { ...appearance, height: { unit: "svh", value: 50 } };
    expect(render(template, [value])).toContain('data-hero-shell="true"');
  });

  it.each(["classic", "modern"] as const)("keeps empty %s Hero Text editable without treating it as public content", (template) => {
    const value = hero(null);
    const emptyText = { id: "empty-text", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "   " }] }] } };
    value.content = { semantic: {}, compositions: { shared: { childFlow: { elements: [emptyText], order: [{ kind: "element", id: emptyText.id }] } } } };
    value.appearance = { ...appearance };
    const editor = render(template, [value], "desktop", "editor");
    expect(editor).toContain('data-editor-website-element="empty-text"');
    expect(render(template, [value])).not.toContain('data-hero-shell="true"');

    value.appearance = { ...appearance, height: { unit: "svh", value: 50 } };
    expect(render(template, [value])).toContain('data-hero-shell="true"');
    value.appearance = { ...appearance, decorativeAppearance: { frame: { style: "fine" } } };
    expect(render(template, [value])).toContain('data-hero-shell="true"');
    value.appearance = { ...appearance, backgroundMedia: { assetId: "image" } };
    expect(render(template, [value])).toContain('data-hero-background-image="true"');

    const visibleText = { ...emptyText, document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Visible" }] }] } };
    value.content = { semantic: {}, compositions: { shared: { childFlow: { elements: [visibleText], order: [{ kind: "element", id: visibleText.id }] } } } };
    value.appearance = { ...appearance };
    expect(render(template, [value])).toContain("Visible");
  });

  it.each(["classic", "modern"] as const)("applies sparse %s Hero image opacity to the image layer only", (template) => {
    for (const opacity of [0, 45, 100]) {
      const value = hero();
      value.appearance = { ...value.appearance, backgroundImageOpacity: opacity };
      const markup = render(template, [value]);
      expect(markup).toContain(`data-hero-background-image="true" class="pointer-events-none absolute inset-0" style="opacity:${opacity / 100}"`);
    }
  });

  it.each(["classic", "modern"] as const)("keeps %s Hero background zero-inset at every semantic width", (template) => {
    for (const viewport of ["desktop", "tablet", "mobile"] as const) {
      const markup = render(template, [hero()], viewport);
      expect(markup).toContain('data-hero-shell="true"');
      expect(markup).toMatch(/data-hero-background-image="true" class="pointer-events-none absolute inset-0"/);
    }
  });

  it.each(["classic", "modern"] as const)("preserves %s Hero focal point and zoom in editor and public output", (template) => {
    const value = hero();
    value.appearance = { ...value.appearance, backgroundMedia: { assetId: "image", focalPoint: { x: 0.2, y: 0.8 }, zoom: 1.4 } };
    for (const mode of ["editor", "public"] as const) {
      const markup = render(template, [value], "mobile", mode);
      expect(markup).toContain('data-media-focal-x="0.2"');
      expect(markup).toContain('data-media-focal-y="0.8"');
      expect(markup).toContain('data-media-zoom="1.4"');
      expect(markup).toContain("absolute inset-0");
      expect(markup).not.toContain("100vw");
    }
  });

  it.each(["classic", "modern"] as const)("renders radically different %s Hero trees in exact target order", (template) => {
    const value = hero();
    const text = (id: string, value: string) => ({ id, type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: value }] }] } });
    const date = (id: string) => ({ id, type: "date" as const, editorName: "Date 1" });
    const media = (id: string) => ({ id, type: "media" as const, editorName: "Media 1", items: [{ id: `${id}-item`, type: "image" as const, mediaId: "image", alt: "Portrait" }] });
    const flow = (elements: import("../websiteElements/types").WebsiteElement[]) => ({ childFlow: { elements, order: elements.map(({ id }) => ({ kind: "element" as const, id })) } });
    const desktopCopy = { id: "desktop-copy", type: "compositionGroup" as const, editorName: "Group 2", children: [text("desktop-name", "Neil & Hazel"), date("desktop-date"), text("desktop-copy-text", "Together with their families")], layout: { direction: "vertical" as const } };
    const desktop = { id: "desktop-layout", type: "compositionGroup" as const, editorName: "Group 1", children: [desktopCopy, media("desktop-media")], layout: { direction: "horizontal" as const, division: "60-40" as const, alignment: "center" as const } };
    const tablet = [text("tablet-name", "Neil & Hazel"), media("tablet-media"), date("tablet-date")];
    const mobile = [media("mobile-media"), text("mobile-neil", "Neil"), text("mobile-ampersand", "&"), text("mobile-hazel", "Hazel"), date("mobile-date")];
    value.content = { semantic: {}, compositions: { shared: flow([text("shared", "Shared Hero")]), custom: { desktop: flow([desktop]), tablet: flow(tablet), mobile: flow(mobile) } } };

    const desktopMarkup = render(template, [value], "desktop");
    expect(desktopMarkup).toContain('grid-template-columns:minmax(0,3fr) minmax(0,2fr)');
    expect(desktopMarkup).toContain("Together with their families");
    const tabletMarkup = render(template, [value], "tablet");
    expect(tabletMarkup.indexOf("Neil &amp; Hazel")).toBeLessThan(tabletMarkup.indexOf('data-media-presentation="single"'));
    const mobileMarkup = render(template, [value], "mobile");
    expect(mobileMarkup.indexOf('data-section-child-element="mobile-media"')).toBeLessThan(mobileMarkup.indexOf('data-section-child-element="mobile-neil"'));
    expect(mobileMarkup.indexOf('data-section-child-element="mobile-neil"')).toBeLessThan(mobileMarkup.indexOf('data-section-child-element="mobile-ampersand"'));
    expect(mobileMarkup.indexOf('data-section-child-element="mobile-ampersand"')).toBeLessThan(mobileMarkup.indexOf('data-section-child-element="mobile-hazel"'));
    expect(mobileMarkup.indexOf('data-section-child-element="mobile-hazel"')).toBeLessThan(mobileMarkup.indexOf('data-section-child-element="mobile-date"'));
    for (const markup of [desktopMarkup, tabletMarkup, mobileMarkup]) {
      expect(markup).toContain("data-section-full-bleed");
      expect(markup).not.toContain("Shared Hero");
    }
  });

  it.each(["classic", "modern"] as const)("keeps an explicitly empty or hidden-only %s Mobile Hero custom without shared fallback", (template) => {
    const value = hero();
    const content = value.content as import("../websiteEditor/types").HeroContent;
    content.compositions.shared.childFlow.elements[0] = { ...content.compositions.shared.childFlow.elements[0], document: { type: "doc", children: [{ type: "paragraph", children: [{ text: "Must not fall back" }] }] } } as never;
    content.compositions.custom = { mobile: { childFlow: { elements: [], order: [] } } };
    const empty = render(template, [value], "mobile");
    expect(empty).toContain("data-hero-shell");
    expect(empty).not.toContain("Must not fall back");
    content.compositions.custom.mobile = { childFlow: { elements: [{ id: "hidden", type: "text", editorName: "Text 1", isHidden: true, document: { type: "doc", children: [{ type: "paragraph", children: [{ text: "Hidden custom" }] }] } }], order: [{ kind: "element", id: "hidden" }] } };
    const hidden = render(template, [value], "mobile");
    expect(hidden).toContain("data-hero-shell");
    expect(hidden).not.toContain("Hidden custom");
    expect(hidden).not.toContain("Must not fall back");
  });

  it.each(["classic", "modern"] as const)("keeps %s semantic background and generic Hero Media independent without vertical clipping", (template) => {
    const value = hero();
    const media = { id: "portrait", type: "media" as const, editorName: "Media 1", items: [{ id: "portrait-item", type: "image" as const, mediaId: "image", alt: "Portrait" }], presentation: { width: "full" as const } };
    value.content = { semantic: {}, compositions: { shared: { childFlow: { elements: [media], order: [{ kind: "element", id: media.id }] } } } };
    const markup = render(template, [value], "mobile", "editor");
    expect(markup).toContain("data-hero-background-image");
    expect(markup).toContain('data-section-child-element="portrait"');
    expect(markup).toContain('data-hero-content-cluster="true" style="width:100%;max-width:100%"');
    expect(markup).toContain('data-section-child-width="container"');
    expect(markup).toContain("overflow-x-clip");
    expect(markup).not.toContain("overflow-y");
  });

  it.each(["classic", "modern"] as const)("resolves %s Hero semantic media independently from composition media", (template) => {
    const value = hero();
    const media = (id: string) => ({ id, type: "media" as const, editorName: "Media 1", items: [{ id: `${id}-item`, type: "image" as const, mediaId: "image", alt: id }] });
    value.content = {
      semantic: {},
      compositions: {
        shared: { childFlow: { elements: [media("shared-media")], order: [{ kind: "element", id: "shared-media" }] } },
        custom: {
          desktop: { childFlow: { elements: [media("desktop-media")], order: [{ kind: "element", id: "desktop-media" }] } },
          mobile: { childFlow: { elements: [], order: [] } },
        },
      },
    };
    value.appearance = { ...appearance, backgroundMedia: { assetId: "image" } };
    const desktop = render(template, [value], "desktop");
    expect(desktop).toContain('src="/hero.jpg"');
    expect(desktop).toContain('data-section-child-element="desktop-media"');
    const tablet = render(template, [value], "tablet");
    expect(tablet).toContain('src="/hero.jpg"');
    expect(tablet).toContain('data-section-child-element="shared-media"');
    const mobile = render(template, [value], "mobile");
    expect(mobile).toContain('src="/hero.jpg"');
    expect(mobile).not.toContain('data-section-child-element="shared-media"');
    expect(mobile).not.toContain('data-media-presentation');
  });

  it.each(["classic", "modern"] as const)("renders %s Sections in persisted array order", (template) => {
    const markup = render(template, [
      section("rsvp", "second", { heading: "RSVP", description: "", buttonLabel: "Reply" }),
      section("gallery", "first", { heading: "Gallery", items: [] }),
    ]);
    expect(markup.indexOf('data-preview-section="second"')).toBeLessThan(markup.indexOf('data-preview-section="first"'));
  });

  it.each(["classic", "modern"] as const)("renders the same semantic Gallery and RSVP contract through %s styling", (template) => {
    const gallery = section("gallery", "gallery", { heading: "Our moments", items: [] });
    const rsvp = section("rsvp", "rsvp", { heading: "Will you join us?", description: "We hope you can celebrate with us.", buttonLabel: "Respond" });
    const editor = render(template, [gallery, rsvp], "mobile", "editor");
    expect(editor).toContain("Our moments");
    expect(editor).toContain("Photos will appear here");
    expect(editor).toContain("Will you join us?");
    expect(editor).toContain("We hope you can celebrate with us.");
    expect(editor).toContain("Respond");
    expect(editor).toContain("data-rsvp-button");
    const publicMarkup = render(template, [gallery, rsvp], "desktop", "public");
    expect(publicMarkup).toContain("Our moments");
    expect(publicMarkup).not.toContain("Photos will appear here");
    expect(publicMarkup).toContain("Will you join us?");
    expect(publicMarkup).toContain("Respond");
  });

  it.each(["classic", "modern"] as const)("isolates every supported %s Blank generic child kind", (template) => {
    const elements = [
      { id: "text", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Plain text" }] }] }, appearance: {} },
      { id: "rich", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Rich text" }] }] }, appearance: {} },
      { id: "divider", type: "divider", editorName: "Divider 1", appearance: {} },
      { id: "media", type: "media", editorName: "Media 1", items: [], presentation: { width: "full" }, appearance: {} },
      { id: "group", type: "compositionGroup", editorName: "Group 1", children: [], layout: { width: "full" } },
    ];
    const order = [
      { kind: "element", id: "text" },
      { kind: "element", id: "rich" },
      { kind: "element", id: "divider" },
      { kind: "element", id: "media" },
      { kind: "element", id: "group" },
    ];
    const markup = render(template, [section("blank", "blank", { childFlow: { elements, order } })], "desktop", "editor");
    expect(markup.match(/data-section-generic-child/g)).toHaveLength(elements.length);
    for (const element of elements) expect(markup).toContain(`data-section-child-element="${element.id}"`);
    expect(markup.indexOf("Plain text")).toBeLessThan(markup.indexOf("Rich text"));
  });

});
