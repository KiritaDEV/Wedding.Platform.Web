import { describe, expect, it } from "vitest";
import { collectRequiredFontIds, platformFont } from "./platformFonts";
import type { WebsiteDraft } from "../websiteEditor/types";
import { fontStylesheetUrl } from "./fontLoader";

describe("fontStylesheetUrl", () => {
  it("loads every advertised weight in normal and italic style", () => {
    const font = platformFont("inter");
    expect(font).toBeDefined();
    const url = fontStylesheetUrl(font!);
    expect(url).toContain("ital,wght@0,400;0,600;0,700;1,400;1,600;1,700");
  });

  it("does not advertise italic for normal-only families", () => {
    expect(fontStylesheetUrl(platformFont("quicksand")!)).toContain("wght@400;600;700");
    expect(fontStylesheetUrl(platformFont("quicksand")!)).not.toContain("ital,wght");
  });

  it("collects an authored Text font from a Date child flow", () => {
    const website = {
      designSettings: { fontSet: "none", projectDefaults: {} },
      projectDesignDefaults: null,
      template: { capabilities: { designLibrary: { typographyPresets: [] } } },
      sections: [{
        type: "blank",
        resolvedDesignContext: null,
        designDefaults: {},
        content: { semantic: {}, compositions: { shared: {
          childFlow: {
            elements: [{ id: "text-1", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Details" }] }] }, appearance: { fontFamilyId: "inter" } }],
            order: [{ kind: "element", id: "text-1" }],
          },
        } } },
      }],
    } as unknown as WebsiteDraft;
    expect(collectRequiredFontIds(website)).toContain("inter");
  });

  it("collects custom-only fonts from every persisted composition and releases them with the branch", () => {
    const text = (id: string, fontFamilyId: string) => ({ id, type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: id }] }] }, appearance: { fontFamilyId } });
    const composition = (element: ReturnType<typeof text>) => ({ childFlow: { elements: [element], order: [{ kind: "element" as const, id: element.id }] } });
    const website = {
      designSettings: { fontSet: "none", projectDefaults: {} }, projectDesignDefaults: null,
      template: { capabilities: { designLibrary: { typographyPresets: [] } } },
      sections: [{ type: "blank", resolvedDesignContext: null, designDefaults: {}, content: { semantic: {}, compositions: {
        shared: composition(text("shared", "inter")), custom: { mobile: composition(text("mobile", "playfair-display")) },
      } } }],
    } as unknown as WebsiteDraft;
    expect(collectRequiredFontIds(website)).toEqual(["inter", "playfair-display"]);
    delete (website.sections[0].content as { compositions: { custom?: unknown } }).compositions.custom;
    expect(collectRequiredFontIds(website)).toEqual(["inter"]);
  });

  it("collects authored Countdown number and label fonts, including inside Groups", () => {
    const countdown = {
      id: "countdown-1",
      type: "countdown" as const,
      editorName: "Countdown 1",
      target: { source: "event" as const },
      appearance: {
        numbers: { fontFamilyId: "fira-code" },
        labels: { fontFamilyId: "great-vibes" },
      },
    };
    const website = {
      designSettings: { fontSet: "none", projectDefaults: {} },
      projectDesignDefaults: null,
      template: { capabilities: { designLibrary: { typographyPresets: [] } } },
      sections: [{
        type: "blank",
        resolvedDesignContext: null,
        designDefaults: {},
        content: { semantic: {}, compositions: { shared: { childFlow: {
          elements: [{ id: "group-1", type: "compositionGroup", editorName: "Group 1", children: [countdown] }],
          order: [{ kind: "element", id: "group-1" }],
        } } } },
      }],
    } as unknown as WebsiteDraft;

    expect(collectRequiredFontIds(website)).toEqual(["fira-code", "great-vibes"]);
  });

  it("collects every authored RSVP runtime font, including Action typography", () => {
    const website = {
      designSettings: { fontSet: "none", projectDefaults: {} },
      projectDesignDefaults: null,
      template: { capabilities: { designLibrary: { typographyPresets: [] } } },
      sections: [{
        type: "rsvp",
        resolvedDesignContext: null,
        designDefaults: {},
        content: { semantic: { runtimeAppearance: {
          status: { fontFamilyId: "playfair-display" },
          guestName: { fontFamilyId: "lora" },
          responseLabel: { fontFamilyId: "inter" },
          supporting: { fontFamilyId: "nunito" },
          action: { typography: { fontFamilyId: "montserrat" } },
        } }, compositions: { shared: { childFlow: { elements: [], order: [{ kind: "specialized", key: "content" }] } } } },
      }],
    } as unknown as WebsiteDraft;
    expect(collectRequiredFontIds(website)).toEqual(["playfair-display", "lora", "inter", "nunito", "montserrat"]);
  });
});
