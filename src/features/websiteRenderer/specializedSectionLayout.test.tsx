import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CompositionGroup } from "../websiteElements/types";
import { SectionChildFlowRenderer } from "./SectionChildFlowRenderer";
import { ClassicFilipinianaGallery, ClassicFilipinianaRsvp } from "./templates/classicFilipiniana/sections";
import { ModernEditorialGallery, ModernEditorialRsvp } from "./templates/modernEditorial/sections";

const chrome = [process.env.CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"]
  .find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));
const browserIt = chrome ? it : it.skip;
const library = { colors: [], fontFamilies: [], palettePresets: [], typographyPresets: [] } as never;

const css = `
  *{box-sizing:border-box}html,body{margin:0}.viewport{overflow:hidden}
  [class~="mx-auto"]{margin-inline:auto}[class~="w-full"]{width:100%}[class~="min-w-0"]{min-width:0}[class~="max-w-full"]{max-width:100%}
  [class~="max-w-xs"]{max-width:20rem}[class~="max-w-lg"]{max-width:32rem}[class~="max-w-xl"]{max-width:36rem}[class~="max-w-2xl"]{max-width:42rem}[class~="max-w-3xl"]{max-width:48rem}[class~="max-w-5xl"]{max-width:64rem}
  [class~="grid"]{display:grid}[class~="flex"]{display:flex}[class~="flex-col"]{flex-direction:column}[class~="inline-block"]{display:inline-block}
  [class~="overflow-hidden"]{overflow:hidden}[class~="whitespace-pre-line"]{white-space:pre-line}[class~="whitespace-normal"]{white-space:normal}
  [class~="[overflow-wrap:anywhere]"]{overflow-wrap:anywhere}[class~="px-8"]{padding-inline:2rem}[class~="py-4"]{padding-block:1rem}[class~="py-3.5"]{padding-block:.875rem}
  [class~="border-2"]{border:2px solid}[class~="border"]{border:1px solid}
  [class~="grid-cols-3"]{grid-template-columns:repeat(3,minmax(0,1fr))}[class~="gap-3"]{gap:.75rem}
  [data-section-specialized-content]{width:100%}
  @media(min-width:768px){[class~="md:grid-cols-[5rem_minmax(0,1fr)]"]{grid-template-columns:5rem minmax(0,1fr)}[class~="md:grid-cols-[5rem_1fr]"]{grid-template-columns:5rem 1fr}}
`;

function chromiumLayout<T>(width: number, markup: string, expression: string): T {
  const directory = mkdtempSync(join(tmpdir(), "section-layout-"));
  try {
    const page = join(directory, "fixture.html");
    writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><main class="viewport" style="width:${width}px">${markup}</main><script>document.title=btoa(JSON.stringify(${expression}))</script></body></html>`);
    const output = execFileSync(chrome!, ["--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${join(directory, "profile")}`, `--window-size=${width},1200`, "--virtual-time-budget=1000", "--dump-dom", pathToFileURL(page).href], { encoding: "utf8", timeout: 30_000 });
    const encoded = output.match(/<title>([^<]+)<\/title>/)?.[1];
    expect(encoded).toBeTruthy();
    return JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as T;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const longToken = "UNBROKEN_LOCALIZED_CONTENT_".repeat(18);
const scenarios = [
  { name: "normal", heading: "Will you join us?", description: "We hope you can celebrate with us.", buttonLabel: "Respond" },
  { name: "heading", heading: longToken, description: "Description", buttonLabel: "Respond" },
  { name: "description", heading: "Heading", description: longToken, buttonLabel: "Respond" },
  { name: "button", heading: "Heading", description: "Description", buttonLabel: longToken },
  { name: "combined", heading: longToken, description: longToken, buttonLabel: longToken },
];

describe("specialized Section browser layout", () => {
  browserIt("contains Classic and Modern RSVP content at mobile, tablet, and desktop widths", () => {
    const renderers = [["classic", ClassicFilipinianaRsvp], ["modern", ModernEditorialRsvp]] as const;
    for (const width of [320, 768, 1200]) {
      const markup = renderers.flatMap(([template, Renderer]) => scenarios.map((scenario) => `<section class="rsvp-case" data-template="${template}" data-scenario="${scenario.name}">${renderToStaticMarkup(<Renderer sectionId="rsvp" content={scenario} />)}</section>`)).join("");
      const results = chromiumLayout<Array<{ template: string; scenario: string; boundaries: Array<{ client: number; scroll: number; width: number }>; ctaVisible: boolean; ctaPointerEvents: string }>>(width, markup, `([...document.querySelectorAll('.rsvp-case')].map(host=>{const special=host.querySelector('[data-section-specialized-content]'),heading=host.querySelector('[data-section-heading]'),body=host.querySelector('[data-section-body]'),cta=host.querySelector('[data-rsvp-button]');return{template:host.dataset.template,scenario:host.dataset.scenario,boundaries:[host,special,heading,body,cta].map(node=>({client:node.clientWidth,scroll:node.scrollWidth,width:node.getBoundingClientRect().width})),ctaVisible:cta.getBoundingClientRect().width>0&&cta.getBoundingClientRect().height>0,ctaPointerEvents:getComputedStyle(cta).pointerEvents}}))`);
      for (const result of results) {
        for (const boundary of result.boundaries) {
          expect(boundary.scroll, `${result.template}/${width}/${result.scenario}`).toBeLessThanOrEqual(boundary.client + 1);
          expect(boundary.width, `${result.template}/${width}/${result.scenario}`).toBeLessThanOrEqual(width + 0.2);
        }
        expect(result.ctaVisible).toBe(true);
        expect(result.ctaPointerEvents).not.toBe("none");
      }
    }
  }, 30_000);

  browserIt("keeps Gallery content and placeholder widths stable for ordinary heading changes", () => {
    const renderers = [["classic", ClassicFilipinianaGallery], ["modern", ModernEditorialGallery]] as const;
    for (const width of [320, 768, 1200]) for (const [template, Renderer] of renderers) {
      const markup = renderToStaticMarkup(<Renderer sectionId="gallery" content={{ heading: "Gallery", items: [] }} mode="editor" />);
      const result = chromiumLayout<{ before: number[]; after: number[]; overflow: boolean }>(width, markup, `(()=>{const host=document.querySelector('.viewport'),special=document.querySelector('[data-section-specialized-content]'),content=special.lastElementChild,heading=document.querySelector('[data-section-heading]'),placeholder=document.querySelector('[aria-label="Empty gallery preview"]')??document.querySelector('[data-section-body]'),measure=()=>[special.getBoundingClientRect().width,content.getBoundingClientRect().width,placeholder.getBoundingClientRect().width];const before=measure();heading.textContent='A longer Gallery heading with ordinary spaced content';const after=measure();return{before,after,overflow:host.scrollWidth>host.clientWidth}})()`);
      expect(result.after, `${template}/${width}`).toEqual(result.before);
      expect(result.overflow).toBe(false);
    }
  }, 30_000);

  browserIt("contains Modern Gallery spaced and unbroken headings without changing its placeholder grid", () => {
    const headings = ["Gallery", "A deliberately long Gallery heading with ordinary spaces that may wrap when needed", longToken];
    for (const width of [320, 768, 1200]) {
      const markup = headings.map((heading, index) => `<section class="gallery-case" data-case="${index}">${renderToStaticMarkup(<ModernEditorialGallery sectionId="gallery" content={{ heading, items: [] }} mode="editor" />)}</section>`).join("");
      const results = chromiumLayout<Array<{ host: number; hostScroll: number; specialized: number; specializedScroll: number; heading: number; headingScroll: number; placeholder: number; placeholderScroll: number }>>(width, markup, `([...document.querySelectorAll('.gallery-case')].map(host=>{const specialized=host.querySelector('[data-section-specialized-content]'),heading=host.querySelector('[data-section-heading]'),placeholder=host.querySelector('[data-section-body]');return{host:host.clientWidth,hostScroll:host.scrollWidth,specialized:specialized.clientWidth,specializedScroll:specialized.scrollWidth,heading:heading.clientWidth,headingScroll:heading.scrollWidth,placeholder:placeholder.getBoundingClientRect().width,placeholderScroll:placeholder.scrollWidth}}))`);
      expect(results).toHaveLength(3);
      const placeholderWidth = results[0].placeholder;
      for (const [index, result] of results.entries()) {
        expect(result.hostScroll, `${width}/${index}/host`).toBeLessThanOrEqual(result.host + 1);
        expect(result.specializedScroll, `${width}/${index}/specialized`).toBeLessThanOrEqual(result.specialized + 1);
        expect(result.headingScroll, `${width}/${index}/heading`).toBeLessThanOrEqual(result.heading + 1);
        expect(result.placeholderScroll, `${width}/${index}/placeholder`).toBeLessThanOrEqual(result.placeholder + 1);
        expect(result.specialized).toBeLessThanOrEqual(width + 0.2);
        expect(result.placeholder).toBeCloseTo(placeholderWidth, 2);
      }
    }
  }, 30_000);

  browserIt("keeps unchanged root and nested Dividers independent in stable Blank/Group-style boundaries", () => {
    const divider = { id: "divider", type: "divider" as const, editorName: "Divider 1", appearance: { width: "medium" as const } };
    const text = { id: "text", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Short" }] }] }, appearance: { fontSize: "7xl" as const } };
    const date = { id: "date", type: "date" as const, editorName: "Date 1" };
    const media = { id: "media", type: "media" as const, editorName: "Media 1", items: [{ id: "item", type: "image" as const, mediaId: "image", alt: "" }], presentation: { width: "small" as const } };
    const vertical = { id: "vertical", type: "compositionGroup" as const, editorName: "Group 1", layout: { direction: "vertical" as const, width: "medium" as const }, children: [text, date, divider] } satisfies CompositionGroup;
    const horizontal = { id: "horizontal", type: "compositionGroup" as const, editorName: "Group 2", layout: { direction: "horizontal" as const, division: "thirds" as const }, children: [{ ...text, id: "horizontal-text" }, { ...date, id: "horizontal-date" }, { ...divider, id: "horizontal-divider" }] } satisfies CompositionGroup;
    const rootElements = [text, date, media, vertical, divider, horizontal];
    const resolvedMedia = { image: { id: "image", originalFilename: "image.jpg", width: 800, height: 600, web: { width: 800, height: 600, url: "/image.jpg" } } };
    const markup = renderToStaticMarkup(<div data-stable-section-boundary className="w-full"><SectionChildFlowRenderer sectionId="blank" flow={{ elements: rootElements, order: rootElements.map(({ id }) => ({ kind: "element" as const, id })) }} specialized={null} mode="public" viewport="desktop" templateKey="classic-filipiniana-v1" library={library} projectColors={[]} eventDate="2027-01-02" media={resolvedMedia} /></div>);
    for (const width of [320, 768, 1200]) {
      const result = chromiumLayout<{ stable: boolean; changedSubjects: boolean; overflow: boolean }>(width, markup, `(()=>{const host=document.querySelector('.viewport'),groups=[...document.querySelectorAll('[data-website-element="group"]')],dividers=[...document.querySelectorAll('[data-website-element="divider"]')],media=document.querySelector('[data-media-presentation] > div'),measure=()=>dividers.map(node=>node.getBoundingClientRect().width);const before=measure();document.querySelector('[data-website-element="text"] p').textContent='${longToken}';document.querySelector('[data-website-element="date"]').textContent='${longToken}';media.style.maxWidth='12rem';groups[0].style.maxWidth='20rem';const after=measure();return{stable:before[1]===after[1]&&before[2]===after[2],changedSubjects:before[0]!==after[0],overflow:host.scrollWidth>host.clientWidth}})()`);
      expect(result.stable, `root and horizontal/${width}`).toBe(true);
      expect(result.changedSubjects, `vertical explicit Group width/${width}`).toBe(width > 320);
      expect(result.overflow, `groups/${width}`).toBe(false);
    }
  }, 30_000);
});

describe("RSVP containment markup", () => {
  it("preserves the normal CTA presentation while adding explicit wrapping", () => {
    const classic = renderToStaticMarkup(<ClassicFilipinianaRsvp sectionId="rsvp" content={scenarios[0]} />);
    expect(classic).toContain("max-w-xs");
    expect(classic).toContain("[overflow-wrap:anywhere]");
    const modern = renderToStaticMarkup(<ModernEditorialRsvp sectionId="rsvp" content={scenarios[0]} />);
    expect(modern).toContain("inline-block");
    expect(modern).toContain("md:grid-cols-[5rem_minmax(0,1fr)]");
    expect(modern).toContain("[overflow-wrap:anywhere]");
  });

  it("opts Modern Gallery into the same shrink-safe grid track without changing its specialized-only contract", () => {
    const gallery = renderToStaticMarkup(<ModernEditorialGallery sectionId="gallery" content={{ heading: "Gallery", items: [] }} mode="editor" />);
    expect(gallery).toContain("md:grid-cols-[5rem_minmax(0,1fr)]");
    expect(gallery).not.toContain("md:grid-cols-[5rem_1fr]");
    expect(gallery).toContain("min-w-0 max-w-full");
    expect(gallery).toContain("[overflow-wrap:anywhere]");
    expect(gallery).not.toContain("data-section-root-flow");
  });
});
