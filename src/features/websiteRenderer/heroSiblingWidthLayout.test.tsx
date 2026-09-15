import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SectionComposition, WebsiteSection } from "../websiteEditor/types";
import { HeroSectionRenderer } from "./HeroSectionRenderer";

const chrome = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));

const library = { colors: [], fontFamilies: [], palettePresets: [], typographyPresets: [] } as never;
const text = { id: "text", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Us" }] }] } };
const date = { id: "date", type: "date" as const, editorName: "Date 1", appearance: { format: "short" as const } };
const divider = { id: "divider", type: "divider" as const, editorName: "Divider 1", appearance: { width: "medium" as const } };
const composition = { childFlow: { elements: [text, divider, date], order: [text, divider, date].map(({ id }) => ({ kind: "element" as const, id })) } } as SectionComposition;

function renderCase(width: number, position: "center-start" | "center" | "center-end") {
  const section = {
    id: `hero-${width}-${position}`,
    type: "hero",
    appearance: { contentPosition: position },
    resolvedDesignContext: null,
  } as unknown as WebsiteSection;
  return `<section class="case" data-width="${width}" data-position="${position}" style="width:${width}px">${renderToStaticMarkup(<HeroSectionRenderer section={section} composition={composition} mode="public" viewport={width <= 320 ? "mobile" : width <= 768 ? "tablet" : "desktop"} templateKey="classic-filipiniana-v1" library={library} projectColors={[]} media={{}} eventDate="2027-01-02" />)}</section>`;
}

const browserIt = chrome ? it : it.skip;

describe("Hero sibling width browser layout", () => {
  browserIt("keeps Divider measurements stable when intrinsic Text and Date siblings change", () => {
    const workspace = mkdtempSync(join(tmpdir(), "hero-width-layout-"));
    try {
      const cases = [320, 768, 1200].flatMap((width) => (["center-start", "center", "center-end"] as const).map((position) => renderCase(width, position))).join("");
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        *{box-sizing:border-box}html,body{margin:0}.case{margin:0 0 16px;overflow:hidden}
        .flex{display:flex}.flex-col{flex-direction:column}.w-full{width:100%}.min-w-0{min-width:0}.max-w-full{max-width:100%}
        [data-hero-foreground]{min-height:160px}[data-section-root-flow]{display:flex;flex-direction:column}
        [data-website-element="text"],[data-website-element="date"]{white-space:normal}
      </style></head><body>${cases}<script>
        const close=(a,b)=>Math.abs(a-b)<0.2;
        const measure=(host)=>{
          const cluster=host.querySelector('[data-hero-content-cluster]');
          const divider=host.querySelector('[data-website-element="divider"]');
          const dividerOuter=divider.closest('[data-block-outer-spacing]');
          const visual=divider.querySelector('span');
          const text=host.querySelector('[data-website-element="text"]');
          const date=host.querySelector('[data-website-element="date"]');
          return {cluster:cluster.getBoundingClientRect(),dividerOuter:dividerOuter.getBoundingClientRect(),divider:divider.getBoundingClientRect(),visual:visual.getBoundingClientRect(),text:text.closest('[data-block-outer-spacing]').getBoundingClientRect(),date:date.closest('[data-block-outer-spacing]').getBoundingClientRect()};
        };
        const results=[...document.querySelectorAll('.case')].map(host=>{
          const before=measure(host);
          host.querySelector('[data-website-element="date"]').textContent='Saturday, September 25, 2027 — a deliberately much wider date';
          const afterDate=measure(host);
          host.querySelector('[data-website-element="text"] p').textContent='A deliberately much wider Text block whose intrinsic size must remain independent';
          const afterText=measure(host);
          host.querySelector('[data-website-element="date"]').textContent='Jan 2, 2027';
          host.querySelector('[data-website-element="text"] p').textContent='Us';
          const beforeTypography=measure(host);
          host.querySelector('[data-website-element="date"]').style.fontSize='40px';
          host.querySelector('[data-website-element="text"]').style.fontSize='40px';
          const afterTypography=measure(host);
          const position=host.dataset.position;
          const aligned=(rect,cluster)=>position==='center-start'?close(rect.left,cluster.left):position==='center-end'?close(rect.right,cluster.right):close(rect.left+rect.width/2,cluster.left+cluster.width/2);
          return {
            width:Number(host.dataset.width),position,
            dateChanged:afterDate.date.width>before.date.width+1,
            textChanged:afterText.text.width>afterDate.text.width+1,
            typographyChanged:afterTypography.date.width>beforeTypography.date.width+1&&afterTypography.text.width>beforeTypography.text.width+1,
            clusterStable:[afterDate,afterText,afterTypography].every(value=>close(before.cluster.width,value.cluster.width)),
            dividerOuterStable:[afterDate,afterText,afterTypography].every(value=>close(before.dividerOuter.width,value.dividerOuter.width)),
            dividerStable:[afterDate,afterText,afterTypography].every(value=>close(before.divider.width,value.divider.width)),
            visualStable:[afterDate,afterText,afterTypography].every(value=>close(before.visual.width,value.visual.width)),
            dividerRatio:afterText.visual.width/afterText.dividerOuter.width,
            textAligned:aligned(afterText.text,afterText.cluster),dateAligned:aligned(afterDate.date,afterDate.cluster),
            contained:afterText.text.width<=afterText.cluster.width+0.2&&afterDate.date.width<=afterDate.cluster.width+0.2,
            noOverflow:host.querySelector('[data-hero-shell]').scrollWidth<=host.querySelector('[data-hero-shell]').clientWidth,
          };
        });
        document.title=btoa(JSON.stringify(results));
      </script></body></html>`;
      const page = join(workspace, "fixture.html");
      writeFileSync(page, html);
      const output = execFileSync(chrome!, ["--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${join(workspace, "profile")}`, "--window-size=1400,1200", "--virtual-time-budget=1000", "--dump-dom", pathToFileURL(page).href], { encoding: "utf8", timeout: 30_000 });
      const encoded = output.match(/<title>([^<]+)<\/title>/)?.[1];
      expect(encoded).toBeTruthy();
      const results = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as Array<Record<string, boolean | number | string>>;
      expect(results).toHaveLength(9);
      for (const result of results) {
        expect(result, JSON.stringify(result)).toMatchObject({ dateChanged: true, textChanged: true, typographyChanged: true, clusterStable: true, dividerOuterStable: true, dividerStable: true, visualStable: true, textAligned: true, dateAligned: true, contained: true, noOverflow: true });
        expect(result.dividerRatio).toBeCloseTo(0.5, 2);
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
