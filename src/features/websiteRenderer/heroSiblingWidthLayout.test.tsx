import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SectionComposition, WebsiteSection } from "../websiteEditor/types";
import { editorDeviceCategory } from "../websiteEditor/responsiveViewport";
import { resolveBackgroundMediaGeometry } from "../websiteElements/mediaCrop";
import { HeroSectionRenderer } from "./HeroSectionRenderer";

const chrome = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));

const library = { colors: [{ id: "ink", value: "#123456" }, { id: "glow", value: "#fedcba" }], fontFamilies: [], palettePresets: [], typographyPresets: [] } as never;
const text = { id: "text", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Us" }] }] }, appearance: { fontFamilyId: "inter", fontWeight: 700, fontSize: "7xl" as const, lineHeight: "tight" as const, letterSpacing: "wide" as const, textTransform: "uppercase" as const, alignment: "center" as const, colorId: "ink", glow: "soft" as const, glowColorId: "glow" } };
const date = { id: "date", type: "date" as const, editorName: "Date 1", appearance: { format: "short" as const } };
const divider = { id: "divider", type: "divider" as const, editorName: "Divider 1", appearance: { width: "medium" as const } };
const group = { id: "group", type: "compositionGroup" as const, editorName: "Group 1", children: [{ ...text, id: "group-text" }], layout: { width: "medium" as const, padding: { top: "s" as const, right: "m" as const, bottom: "s" as const, left: "m" as const } } };
const foregroundMedia = { id: "foreground-media", type: "media" as const, editorName: "Media 1", items: [{ id: "foreground-image", type: "image" as const, mediaId: "image", alt: "Foreground" }], presentation: { width: "medium" as const, aspectRatio: "landscape" as const } };
const composition = { childFlow: { elements: [text, divider, date, group, foregroundMedia], order: [text, divider, date, group, foregroundMedia].map(({ id }) => ({ kind: "element" as const, id })) } } as SectionComposition;
const media = { image: { id: "image", originalFilename: "hero.svg", width: 1600, height: 900, web: { width: 1600, height: 900, url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'%3E%3Crect width='1600' height='900' fill='%23abc'/%3E%3C/svg%3E" } } } as never;

function renderCase(width: number, position: "center-start" | "center" | "center-end", mode: "editor" | "public", height: number | null) {
  const section = {
    id: `hero-${width}-${position}-${height ?? "automatic"}`,
    type: "hero",
    appearance: { ...(height === null ? {} : { height: { unit: "svh", value: height } }), contentPosition: position, innerSpacing: { top: "s", right: "m", bottom: "l", left: "xl" }, backgroundMedia: { assetId: "image", focalPoint: { x: 0.2, y: 0.8 }, zoom: 1.4 }, backgroundImageOpacity: 45, decorativeAppearance: { background: { texture: "paper", textureStrength: 60, pattern: "botanical", patternStrength: 70, overlay: "soft" }, frame: { style: "ornamental", size: 84, strength: 65, colorId: "ink" } } },
    resolvedDesignContext: null,
  } as unknown as WebsiteSection;
  return `<section class="case" data-width="${width}" data-position="${position}" data-mode="${mode}" data-height="${height ?? "automatic"}" style="width:${width}px">${renderToStaticMarkup(<HeroSectionRenderer section={section} composition={composition} mode={mode} viewport={editorDeviceCategory(width)} templateKey="classic-filipiniana-v1" library={library} projectColors={[]} media={media} eventDate="2027-01-02" />)}</section>`;
}

const browserIt = chrome ? it : it.skip;

function renderBackgroundCoverCases() {
  const containers = [{ width: 320, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }];
  const sources = [{ width: 1600, height: 900 }, { width: 900, height: 1600 }, { width: 1200, height: 1200 }];
  const points = [{ x: .5, y: .5 }, { x: 0, y: 0 }, { x: 1, y: 1 }];
  return containers.flatMap((container) => sources.flatMap((source) => [1, 1.5, 3].flatMap((zoom) => points.map((point) => {
    const geometry = resolveBackgroundMediaGeometry(container, source, point, zoom);
    return `<div class="cover-case" style="position:relative;overflow:hidden;width:${container.width}px;height:${container.height}px"><img alt="" style="position:absolute;left:${geometry.left}px;top:${geometry.top}px;width:${geometry.width}px;height:${geometry.height}px" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${source.width}' height='${source.height}'/%3E"></div>`;
  })))).join("");
}

describe("Hero sibling width browser layout", () => {
  browserIt("keeps Divider measurements stable when intrinsic Text and Date siblings change", () => {
    const workspace = mkdtempSync(join(tmpdir(), "hero-width-layout-"));
    try {
      const cases = [320, 768, 1280, 1440].flatMap((width) => [null, 25, 50, 75, 100, 125, 150].flatMap((height) => (["center-start", "center", "center-end"] as const).flatMap((position) => (["editor", "public"] as const).map((mode) => renderCase(width, position, mode, height))))).join("");
      const backgroundCases = renderBackgroundCoverCases();
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        *{box-sizing:border-box}html,body{margin:0}.case{margin:0 0 16px;overflow:hidden}
        .flex{display:flex}.flex-col{flex-direction:column}.w-full{width:100%}.min-w-0{min-width:0}.max-w-full{max-width:100%}
        .relative{position:relative}.absolute{position:absolute}.inset-0{inset:0}.block{display:block}.h-full{height:100%}.w-full{width:100%}.overflow-hidden{overflow:hidden}.object-cover{object-fit:cover}.object-center{object-position:center}.editor-element-badge,.editor-selection-frame,.editor-divider-hit-area{position:absolute}
        [data-hero-foreground]{min-height:160px}[data-section-root-flow]{display:flex;flex-direction:column}
        [data-website-element="text"],[data-website-element="date"]{white-space:normal}
      </style></head><body>${cases}${backgroundCases}<script>
        const close=(a,b)=>Math.abs(a-b)<0.2;
        const measure=(host)=>{
          const cluster=host.querySelector('[data-hero-content-cluster]');
          const divider=host.querySelector('[data-website-element="divider"]');
          const dividerOuter=divider.closest('[data-block-outer-spacing]');
          const visual=divider.querySelector('span');
          const text=host.querySelector('[data-website-element="text"]');
          const date=host.querySelector('[data-website-element="date"]');
          const group=host.querySelector('[data-website-element="group"]');
          const media=host.querySelector('[data-media-presentation]');
          return {cluster:cluster.getBoundingClientRect(),dividerOuter:dividerOuter.getBoundingClientRect(),divider:divider.getBoundingClientRect(),visual:visual.getBoundingClientRect(),text:text.closest('[data-block-outer-spacing]').getBoundingClientRect(),date:date.closest('[data-block-outer-spacing]').getBoundingClientRect(),group:group.getBoundingClientRect(),media:media.getBoundingClientRect()};
        };
        const results=[...document.querySelectorAll('.case')].map(host=>{
          const before=measure(host);
          host.querySelector('[data-website-element="date"]').textContent='Saturday, September 25, 2027 - a deliberately much wider date';
          const afterDate=measure(host);
          host.querySelector('[data-website-element="text"] p').textContent='A deliberately much wider Text block whose intrinsic size must remain independent';
          const afterText=measure(host);
          host.querySelector('[data-website-element="date"]').textContent='Jan 2, 2027';
          host.querySelector('[data-website-element="text"] p').textContent='Us';
          const beforeTypography=measure(host);
          host.querySelector('[data-website-element="date"]').style.fontSize='160px';
          host.querySelector('[data-website-element="text"]').style.fontSize='160px';
          const afterTypography=measure(host);
          const position=host.dataset.position;
          const aligned=(rect,cluster)=>position==='center-start'?close(rect.left,cluster.left):position==='center-end'?close(rect.right,cluster.right):close(rect.left+rect.width/2,cluster.left+cluster.width/2);
          return {
            width:Number(host.dataset.width),position,mode:host.dataset.mode,height:host.dataset.height,
            geometry:{
              shellWidth:host.querySelector('[data-hero-shell]').getBoundingClientRect().width,
              shellHeight:host.querySelector('[data-hero-shell]').getBoundingClientRect().height,
              foregroundWidth:host.querySelector('[data-hero-foreground]').getBoundingClientRect().width,
              foregroundHeight:host.querySelector('[data-hero-foreground]').getBoundingClientRect().height,
              clusterWidth:before.cluster.width,
              dividerOuterWidth:before.dividerOuter.width,
              dividerWidth:before.divider.width,
              dividerVisualWidth:before.visual.width,
              textWidth:before.text.width,
              dateWidth:before.date.width,
              groupWidth:before.group.width,
              mediaWidth:before.media.width,
              mediaHeight:before.media.height,
            },
            typography:Object.fromEntries(['fontFamily','fontWeight','fontSize','lineHeight','letterSpacing','textTransform','textAlign','color','textShadow'].map(key=>[key,getComputedStyle(host.querySelector('[data-website-element="text"]'))[key]])),
            background:{layer:(()=>{const rect=host.querySelector('[data-background-media-layer]').getBoundingClientRect();return {width:rect.width,height:rect.height}})(),focalX:host.querySelector('[data-media-focal-x]').dataset.mediaFocalX,focalY:host.querySelector('[data-media-focal-y]').dataset.mediaFocalY,zoom:host.querySelector('[data-media-zoom]').dataset.mediaZoom,opacity:getComputedStyle(host.querySelector('[data-background-media-layer]')).opacity,overflow:getComputedStyle(host.querySelector('[data-hero-shell]')).overflowX},
            decoration:{hosts:[...host.querySelectorAll('[data-section-decoration]')].map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})),corners:[...host.querySelectorAll('[data-section-decoration-phase="frame"] span span')].map(node=>({width:node.getBoundingClientRect().width,top:getComputedStyle(node).top,right:getComputedStyle(node).right,bottom:getComputedStyle(node).bottom,left:getComputedStyle(node).left,transform:getComputedStyle(node).transform,opacity:getComputedStyle(node).opacity}))},
            dateChanged:afterDate.date.width>before.date.width+1,
            textChanged:afterText.text.width>afterDate.text.width+1,
            typographyChanged:afterTypography.date.width>beforeTypography.date.width+1&&afterTypography.text.width>beforeTypography.text.width+1,
            clusterStable:[afterDate,afterText,afterTypography].every(value=>close(before.cluster.width,value.cluster.width)),
            dividerOuterStable:[afterDate,afterText,afterTypography].every(value=>close(before.dividerOuter.width,value.dividerOuter.width)),
            dividerStable:[afterDate,afterText,afterTypography].every(value=>close(before.divider.width,value.divider.width)),
            visualStable:[afterDate,afterText,afterTypography].every(value=>close(before.visual.width,value.visual.width)),
            dividerRatio:afterText.visual.width/afterText.dividerOuter.width,
            textAligned:aligned(afterText.text,afterText.cluster),dateAligned:aligned(afterDate.date,afterDate.cluster),groupAligned:aligned(before.group,before.cluster),
            contained:afterText.text.width<=afterText.cluster.width+0.2&&afterDate.date.width<=afterDate.cluster.width+0.2,
            noOverflow:host.querySelector('[data-hero-shell]').scrollWidth<=host.querySelector('[data-hero-shell]').clientWidth,
            noVerticalOverflow:host.querySelector('[data-hero-shell]').scrollHeight<=host.querySelector('[data-hero-shell]').clientHeight+.2,
            minimumSatisfied:host.dataset.height==='automatic'||host.querySelector('[data-hero-shell]').getBoundingClientRect().height+.2>=innerHeight*Number(host.dataset.height)/100,
          };
        });
        const parity=[];
        for(const editor of results.filter(value=>value.mode==='editor')){
          const preview=results.find(value=>value.mode==='public'&&value.width===editor.width&&value.position===editor.position&&value.height===editor.height);
          const backgroundMatches=Boolean(preview)&&close(editor.background.layer.width,preview.background.layer.width)&&close(editor.background.layer.height,preview.background.layer.height)&&['focalX','focalY','zoom','opacity','overflow'].every(key=>editor.background[key]===preview.background[key]);
          const decorationMatches=Boolean(preview)&&editor.decoration.hosts.length===preview.decoration.hosts.length&&editor.decoration.hosts.every((host,index)=>close(host.width,preview.decoration.hosts[index].width)&&close(host.height,preview.decoration.hosts[index].height))&&JSON.stringify(editor.decoration.corners)===JSON.stringify(preview.decoration.corners);
          const checks={geometry:Boolean(preview)&&Object.keys(editor.geometry).every(key=>close(editor.geometry[key],preview.geometry[key])),typography:Boolean(preview)&&JSON.stringify(editor.typography)===JSON.stringify(preview.typography),background:backgroundMatches,decoration:decorationMatches,behavior:Boolean(preview)&&['clusterStable','dividerOuterStable','dividerStable','visualStable','textAligned','dateAligned','contained','noOverflow'].every(key=>editor[key]===preview[key])&&close(editor.dividerRatio,preview.dividerRatio)};
          parity.push({width:editor.width,position:editor.position,editorGeometry:editor.geometry,previewGeometry:preview?.geometry,checks,matched:Object.values(checks).every(Boolean)});
        }
        const cover=[...document.querySelectorAll('.cover-case')].map(host=>{const image=host.querySelector('img'),outer=host.getBoundingClientRect(),inner=image.getBoundingClientRect();return inner.left<=outer.left+.2&&inner.top<=outer.top+.2&&inner.right>=outer.right-.2&&inner.bottom>=outer.bottom-.2});
        document.title=btoa(JSON.stringify({results,parity,cover}));
      </script></body></html>`;
      const page = join(workspace, "fixture.html");
      writeFileSync(page, html);
      const output = execFileSync(chrome!, ["--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${join(workspace, "profile")}`, "--window-size=1400,1200", "--virtual-time-budget=1000", "--dump-dom", pathToFileURL(page).href], { encoding: "utf8", timeout: 30_000, maxBuffer: 20 * 1024 * 1024 });
      const encoded = output.match(/<title>([^<]+)<\/title>/)?.[1];
      expect(encoded).toBeTruthy();
      const payload = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as { results: Array<Record<string, boolean | number | string>>; parity: Array<Record<string, boolean | number | string>>; cover: boolean[] };
      const { results, parity, cover } = payload;
      expect(results).toHaveLength(168);
      for (const result of results) {
        expect(result, JSON.stringify(result)).toMatchObject({ dateChanged: true, textChanged: true, typographyChanged: true, clusterStable: true, dividerOuterStable: true, dividerStable: true, visualStable: true, textAligned: true, dateAligned: true, groupAligned: true, contained: true, noOverflow: true, noVerticalOverflow: true, minimumSatisfied: true });
        expect(result.dividerRatio).toBeCloseTo(0.5, 2);
      }
      expect(parity).toHaveLength(84);
      for (const result of parity) expect(result, JSON.stringify(result)).toMatchObject({ matched: true });
      expect(cover).toHaveLength(108);
      expect(cover.every(Boolean)).toBe(true);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 30_000);

  browserIt("places every constrained Group width from the Hero boundary without changing Group internals", () => {
    const workspace = mkdtempSync(join(tmpdir(), "hero-group-placement-"));
    try {
      const widths = [320, 768, 1280] as const;
      const presets = ["narrow", "medium", "wide", "full"] as const;
      const positions = ["center-start", "center", "center-end"] as const;
      const cases = widths.flatMap((width) => presets.flatMap((preset) => positions.map((position) => {
        const candidate = { ...group, layout: { ...group.layout, width: preset, alignment: "end" as const, gap: "m" as const } };
        const candidateComposition = { childFlow: { elements: [candidate], order: [{ kind: "element" as const, id: candidate.id }] } } as SectionComposition;
        const section = { id: `placement-${width}-${preset}-${position}`, type: "hero", appearance: { contentPosition: position }, resolvedDesignContext: null } as unknown as WebsiteSection;
        return `<section class="placement" data-width="${width}" data-preset="${preset}" data-position="${position}" style="width:${width}px">${renderToStaticMarkup(<HeroSectionRenderer section={section} composition={candidateComposition} mode="public" viewport={editorDeviceCategory(width)} templateKey="classic-filipiniana-v1" library={library} projectColors={[]} media={media} eventDate="2027-01-02" />)}</section>`;
      }))).join("");
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0}.flex{display:flex}.flex-col{flex-direction:column}.w-full{width:100%}.min-w-0{min-width:0}.max-w-full{max-width:100%}</style></head><body>${cases}<script>
        const close=(a,b)=>Math.abs(a-b)<.2;
        const max={narrow:512,medium:768,wide:1152,full:Infinity};
        const results=[...document.querySelectorAll('.placement')].map(host=>{const boundary=host.querySelector('[data-hero-content-cluster]').getBoundingClientRect(),group=host.querySelector('[data-website-element="group"]').getBoundingClientRect(),position=host.dataset.position,preset=host.dataset.preset,expectedWidth=Math.min(boundary.width,max[preset]);return{width:Number(host.dataset.width),preset,position,widthStable:close(group.width,expectedWidth),aligned:position==='center-start'?close(group.left,boundary.left):position==='center-end'?close(group.right,boundary.right):close(group.left+group.width/2,boundary.left+boundary.width/2),internalAlignment:host.querySelector('[data-group-child-containment]').dataset.groupChildAlignment,overflow:host.scrollWidth>host.clientWidth}});
        document.title=btoa(JSON.stringify(results));
      </script></body></html>`;
      const page = join(workspace, "fixture.html");
      writeFileSync(page, html);
      const output = execFileSync(chrome!, ["--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${join(workspace, "profile")}`, "--window-size=1400,1200", "--virtual-time-budget=1000", "--dump-dom", pathToFileURL(page).href], { encoding: "utf8", timeout: 30_000, maxBuffer: 20 * 1024 * 1024 });
      const encoded = output.match(/<title>([^<]+)<\/title>/)?.[1];
      expect(encoded).toBeTruthy();
      const results = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as Array<{ widthStable: boolean; aligned: boolean; internalAlignment: string; overflow: boolean }>;
      expect(results).toHaveLength(36);
      for (const result of results) expect(result).toMatchObject({ widthStable: true, aligned: true, internalAlignment: "end", overflow: false });
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 30_000);
});
