import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MediaElementRenderer } from "../websiteRenderer/MediaElementRenderer";
import { createMediaElement } from "../websiteEditor/sectionChildFlow";
import { MediaElementEditor } from "../websiteEditor/components/MediaElementEditor";
import { carouselAutoplayStep, carouselIndex, carouselIntervalMilliseconds, carouselIntervalSeconds, directVideoUrlIssue, mediaAutoplayAllowed, replaceMediaImageSource, resolveMediaPresentation, setMediaImageDecorative, setMediaImageFraming, setMediaItems, setMediaPresentationProperty, shouldShowMediaVideoLoadError } from "./media";
import { mediaElementSchema } from "./schemas";
import type { MediaElement } from "./types";

const first = "01J00000000000000000000000";
const second = "01J00000000000000000000001";
const images = [{ id: "one", type: "image" as const, mediaId: first, alt: "First" }, { id: "two", type: "image" as const, mediaId: second, alt: "Second" }];

describe("Media element", () => {
  it("creates the sparse empty canonical shape", () => {
    const element = createMediaElement("Media 1");
    expect(element).toEqual({ id: expect.any(String), type: "media", editorName: "Media 1", items: [] });
    expect(mediaElementSchema.parse(element)).toEqual(element);
  });

  it("keeps empty and unresolved diagnostics editor-only", () => {
    const empty = mediaElementSchema.parse({ id: "empty", type: "media", editorName: "Media 1", items: [] });
    expect(renderToStaticMarkup(<MediaElementRenderer element={empty} viewport="desktop" media={{}} mode="editor" />)).toContain("data-media-empty");
    expect(renderToStaticMarkup(<MediaElementRenderer element={empty} viewport="desktop" media={{}} mode="public" />)).toBe("");

    const unresolved = mediaElementSchema.parse({ id: "missing", type: "media", editorName: "Media 2", items: [{ id: "missing-item", type: "image", mediaId: first, alt: "Missing" }] });
    expect(renderToStaticMarkup(<MediaElementRenderer element={unresolved} viewport="desktop" media={{}} mode="editor" />)).toContain("Media unavailable");
    expect(renderToStaticMarkup(<MediaElementRenderer element={unresolved} viewport="desktop" media={{}} mode="public" />)).toBe("");
  });

  it("filters unresolved public slides and derives effective mode from resolved items", () => {
    const asset = { id: first, originalFilename: "first.jpg", width: 100, height: 100, web: { width: 100, height: 100, url: "/first.jpg" } };
    const oneResolved = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images, presentation: { mode: "carousel" } });
    const single = renderToStaticMarkup(<MediaElementRenderer element={oneResolved} viewport="desktop" media={{ [first]: asset }} />);
    expect(single).toContain('data-media-presentation="single"');
    expect(single).not.toContain('aria-roledescription="carousel"');
    expect(single).not.toContain("Media unavailable");

    const third = "01J00000000000000000000002";
    const threeItems = mediaElementSchema.parse({ ...oneResolved, items: [...images, { id: "three", type: "image", mediaId: third, alt: "Third" }] });
    const twoResolved = renderToStaticMarkup(<MediaElementRenderer element={threeItems} viewport="desktop" media={{ [first]: asset, [third]: { ...asset, id: third, web: { ...asset.web, url: "/third.jpg" } } }} />);
    expect(twoResolved).toContain('data-media-presentation="carousel"');
    expect(twoResolved).toContain("Photo 1 of 2");
    expect(twoResolved).not.toContain("Media unavailable");
  });

  it.each([["natural", "1200 / 800"], ["square", "1 / 1"], ["portrait", "3 / 4"], ["landscape", "4 / 3"], ["wide", "16 / 9"]] as const)("renders %s with the shared %s crop ratio", (aspectRatio, ratio) => {
    const element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: [{ ...images[0], focalPoint: { x: 0.7, y: 0.3 }, zoom: 1.5 }], presentation: { aspectRatio } });
    const asset = { id: first, originalFilename: "photo.jpg", width: 1200, height: 800, web: { width: 1200, height: 800, url: "/photo.jpg" } };
    const html = renderToStaticMarkup(<MediaElementRenderer element={element} viewport="desktop" media={{ [first]: asset }} />);
    expect(html).toContain(`aspect-ratio:${ratio}`);
    expect(html).toContain('data-media-focal-x="0.7"');
    expect(html).toContain('data-media-zoom="1.5"');
  });

  it("keeps focal state visually dormant under Contain", () => {
    const element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: [{ ...images[0], focalPoint: { x: 0.7, y: 0.3 }, zoom: 1.5 }], presentation: { aspectRatio: "square", fit: "contain" } });
    const asset = { id: first, originalFilename: "photo.jpg", width: 1200, height: 800, web: { width: 1200, height: 800, url: "/photo.jpg" } };
    const html = renderToStaticMarkup(<MediaElementRenderer element={element} viewport="desktop" media={{ [first]: asset }} />);
    expect(html).toContain("object-contain");
    expect(html).not.toContain("data-media-focal-x");
    expect(element.items[0]).toMatchObject({ focalPoint: { x: 0.7, y: 0.3 }, zoom: 1.5 });
  });

  it("renders canonical video without a resolved image map", () => {
    const video = mediaElementSchema.parse({ id: "video", type: "media", editorName: "Media 1", items: [{ id: "clip", type: "video", url: "https://example.com/video.mp4" }] });
    expect(renderToStaticMarkup(<MediaElementRenderer element={video} viewport="desktop" media={{}} />)).toContain("<video");
  });

  it("accepts only one video or up to eight images and rejects gallery-scale state", () => {
    expect(mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: [{ id: "video", type: "video", url: "https://example.com/video.mp4", controls: true }] })).toBeTruthy();
    expect(() => mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: [...images, { id: "video", type: "video", url: "https://example.com/a.mp4" }] })).toThrow(/Mixed/);
    expect(() => mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: Array.from({ length: 9 }, (_, index) => ({ id: `i-${index}`, type: "image", mediaId: first, alt: "Photo" })) })).toThrow();
    for (const mode of ["grid", "masonry", "stack"]) expect(() => mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images, presentation: { mode } })).toThrow();
    expect(() => mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images, presentation: { mode: "carousel", columns: 3 } })).toThrow();
    expect(() => mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images, motion: { type: "fade" } })).toThrow();
  });

  it("rejects removed stacked and carousel-style state", () => {
    const makeImages = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `item-${index}`, type: "image" as const, mediaId: first, alt: `Photo ${index + 1}` }));
    expect(mediaElementSchema.safeParse({ id: "media", type: "media", editorName: "Media 1", items: makeImages(2), presentation: { mode: "stacked" } }).success).toBe(false);
    expect(mediaElementSchema.safeParse({ id: "media", type: "media", editorName: "Media 1", items: makeImages(2), presentation: { stacked: { style: "polaroid" } } }).success).toBe(false);
    expect(mediaElementSchema.safeParse({ id: "media", type: "media", editorName: "Media 1", items: makeImages(2), presentation: { mode: "carousel", carousel: { style: "peek" } } }).success).toBe(false);
    expect(mediaElementSchema.safeParse({ id: "media", type: "media", editorName: "Media 1", items: makeImages(8), presentation: { mode: "carousel" } }).success).toBe(true);
  });

  it("normalizes block identity and rejects noncanonical JSON scalar types", () => {
    const canonical = mediaElementSchema.parse({ id: " media ", type: "media", editorName: "  Media   name  ", items: [{ id: " image ", type: "image", mediaId: first, alt: "Photo", focalPoint: { x: 0.5, y: 0.5 }, zoom: 1.5 }], presentation: { carousel: { interval: 5000, autoplay: true } } });
    expect(canonical.id).toBe("media");
    expect(canonical.editorName).toBe("Media name");
    expect(canonical.items[0].id).toBe("image");
    for (const candidate of [
      { items: [{ id: "image", type: "image", mediaId: first, alt: "Photo", zoom: "1.5" }] },
      { items: [{ id: "image", type: "image", mediaId: first, alt: "Photo", focalPoint: { x: "0.5", y: 0.5 } }] },
      { items: images, presentation: { mode: "carousel", carousel: { interval: "5000" } } },
      { items: [{ id: "video", type: "video", url: "https://example.com/video.mp4", controls: 1 }] },
      { items: images, presentation: { mode: "carousel", carousel: { autoplay: "true" } } },
    ]) expect(mediaElementSchema.safeParse({ id: "media", type: "media", editorName: "Media 1", ...candidate }).success).toBe(false);
  });

  it("accepts object-shaped empty containers and rejects arrays in their place", () => {
    const base = { id: "media", type: "media" as const, editorName: "Media 1", items: [] };
    expect(mediaElementSchema.safeParse({ ...base, presentation: {}, appearance: {} }).success).toBe(true);
    for (const candidate of [
      { presentation: [] },
      { appearance: [] },
      { presentation: { carousel: [] } },
      { presentation: { responsive: [] } },
      { presentation: { responsive: { tablet: [] } } },
      { presentation: { responsive: { mobile: [] } } },
    ]) expect(mediaElementSchema.safeParse({ ...base, ...candidate }).success).toBe(false);
  });

  it("uses independent viewport overrides while keeping alignment and fit global", () => {
    let element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images, presentation: { mode: "carousel", width: "medium", alignment: "start", fit: "contain", responsive: { tablet: { width: "small" }, mobile: { aspectRatio: "square" } } } });
    expect(resolveMediaPresentation(element, "mobile")).toMatchObject({ width: "medium", aspectRatio: "square", alignment: "start", fit: "contain" });
    element = setMediaPresentationProperty(element, "mobile", "alignment", "end");
    expect(element.presentation?.alignment).toBe("end");
    expect(element.presentation?.responsive?.mobile).not.toHaveProperty("alignment");
  });

  it("prunes semantically empty presentation containers produced by helpers", () => {
    const element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: [] });
    expect(setMediaPresentationProperty(element, "desktop", "carousel", {})).not.toHaveProperty("presentation");
  });

  it("prunes device values equal to Desktop without comparing Mobile to Tablet", () => {
    let element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images, presentation: { mode: "carousel", width: "large", aspectRatio: "square" } });
    element = setMediaPresentationProperty(element, "tablet", "width", "large");
    element = setMediaPresentationProperty(element, "mobile", "aspectRatio", "square");
    element = setMediaPresentationProperty(element, "tablet", "mode", "carousel");
    expect(element.presentation?.responsive).toBeUndefined();

    element = setMediaPresentationProperty(element, "tablet", "width", "small");
    expect(resolveMediaPresentation(element, "tablet").width).toBe("small");
    expect(resolveMediaPresentation(element, "mobile").width).toBe("large");
    expect(resolveMediaPresentation(element, "desktop").width).toBe("large");
  });

  it("renormalizes device overrides after Desktop changes while preserving unrelated overrides", () => {
    let element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images, presentation: { mode: "carousel", width: "large", responsive: { tablet: { width: "small", aspectRatio: "square" }, mobile: { width: "small" } } } });
    element = setMediaPresentationProperty(element, "desktop", "width", "small");
    expect(element.presentation?.responsive?.tablet).toEqual({ aspectRatio: "square" });
    expect(element.presentation?.responsive?.mobile).toBeUndefined();
  });

  it("keeps alignment, fit, and carousel global on semantic devices", () => {
    let element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images });
    element = setMediaPresentationProperty(element, "tablet", "alignment", "end");
    element = setMediaPresentationProperty(element, "mobile", "fit", "contain");
    element = setMediaPresentationProperty(element, "tablet", "carousel", { loop: false });
    expect(element.presentation).toMatchObject({ alignment: "end", fit: "contain", carousel: { loop: false } });
    expect(element.presentation?.responsive).toBeUndefined();
  });

  it("normalizes modes sparsely across item-count transitions", () => {
    const empty = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: [], presentation: { width: "large" } });
    const one = setMediaItems(empty, [images[0]]);
    expect(one.presentation).toEqual({ width: "large" });

    const authoredSingle = mediaElementSchema.parse({ ...one, presentation: { mode: "single", responsive: { tablet: { mode: "single" }, mobile: { mode: "single", width: "small" } } } });
    const two = setMediaItems(authoredSingle, images);
    expect(two.presentation).toEqual({ mode: "carousel", responsive: { mobile: { width: "small" } } });
    const backToOne = setMediaItems(two, [images[0]]);
    expect(backToOne.presentation).toEqual({ mode: "single", responsive: { mobile: { width: "small" } } });
    const backToEmpty = setMediaItems(backToOne, []);
    expect(backToEmpty.presentation).toEqual({ responsive: { mobile: { width: "small" } } });
  });

  it("resolves without mutation and viewport switching requires no authoring write", () => {
    const element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images, presentation: { width: "large", responsive: { tablet: { width: "small" } } } });
    const before = structuredClone(element);
    expect(resolveMediaPresentation(element, "desktop").width).toBe("large");
    expect(resolveMediaPresentation(element, "tablet").width).toBe("small");
    expect(resolveMediaPresentation(element, "mobile").width).toBe("large");
    expect(element).toEqual(before);
  });

  it("renders an accessible carousel without an autoplay live region", () => {
    const element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images, presentation: { mode: "carousel", carousel: { arrows: true, dots: true, loop: false } } });
    const asset = (id: string, url: string) => ({ id, originalFilename: `${id}.jpg`, width: 100, height: 100, web: { width: 100, height: 100, url } });
    const html = renderToStaticMarkup(<MediaElementRenderer element={element} viewport="desktop" media={{ [first]: asset(first, "/first.jpg"), [second]: asset(second, "/second.jpg") }} />);
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('<p data-carousel-position="true" class="sr-only">Photo 1 of 2</p>');
    expect(html).toContain('aria-label="Previous photo"');
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain("grid-template-columns");
    const viewportStart = html.indexOf('data-carousel-viewport="true"');
    const viewportEnd = html.indexOf('<p data-carousel-position', viewportStart);
    expect(html.indexOf('data-carousel-arrows="true"')).toBeGreaterThan(viewportStart);
    expect(html.indexOf('data-carousel-arrows="true"')).toBeLessThan(viewportEnd);
    expect(html.indexOf('data-carousel-dots="true"')).toBeGreaterThan(viewportStart);
    expect(html.indexOf('data-carousel-dots="true"')).toBeLessThan(viewportEnd);
    expect(html.indexOf('data-carousel-dots="true"')).toBeGreaterThan(html.indexOf('data-carousel-active-card="true"'));
    expect(html).not.toMatch(/data-carousel-dots[^>]*bg-black\//);
    expect(html).not.toMatch(/data-carousel-dots[^>]*backdrop-blur/);
    expect(html).toContain("bg-black/20");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).not.toContain("mt-2 text-center text-xs");
    expect(html).not.toContain("mt-2 flex items-center");
  });

  it("bounds manual navigation and disables autoplay for reduced motion", () => {
    expect(carouselIndex(0, -1, 2, false)).toBe(0);
    expect(carouselIndex(1, 1, 2, false)).toBe(1);
    expect(carouselIndex(1, 1, 2, true)).toBe(0);
    expect(carouselAutoplayStep(0, 2, false)).toEqual({ next: 1, stop: true });
    expect(carouselAutoplayStep(1, 2, true)).toEqual({ next: 0, stop: false });
    expect(mediaAutoplayAllowed(true, 2, true)).toBe(false);
    expect(mediaAutoplayAllowed(true, 2, false)).toBe(true);
    expect(mediaAutoplayAllowed(true, 2, false, "editor")).toBe(false);
    expect(mediaAutoplayAllowed(true, 2, false, "public")).toBe(true);
  });

  it("exposes loop and non-loop boundary controls accessibly", () => {
    const asset = (id: string) => ({ id, originalFilename: `${id}.jpg`, width: 100, height: 100, web: { width: 100, height: 100, url: `/${id}.jpg` } });
    const nonLoop = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images, presentation: { mode: "carousel", carousel: { loop: false } } });
    const bounded = renderToStaticMarkup(<MediaElementRenderer element={nonLoop} viewport="desktop" media={{ [first]: asset(first), [second]: asset(second) }} />);
    expect(bounded).toMatch(/aria-label="Previous photo" disabled=""/);
    expect(bounded).not.toMatch(/aria-label="Next photo" disabled=""/);
    expect(bounded.match(/aria-label="Show photo/g)).toHaveLength(2);
    expect(bounded).toContain('aria-current="true"');
    expect(bounded).toContain("Photo 1 of 2");

    const looped = renderToStaticMarkup(<MediaElementRenderer element={{ ...nonLoop, presentation: { mode: "carousel", carousel: { loop: true } } }} viewport="desktop" media={{ [first]: asset(first), [second]: asset(second) }} />);
    expect(looped).not.toContain('aria-label="Previous photo" disabled');
    expect(looped).not.toContain('aria-label="Next photo" disabled');
  });

  it("shows carousel settings only for an authored image carousel and preserves autoplay in editor state", () => {
    const renderEditor = (element: MediaElement) => renderToStaticMarkup(<MemoryRouter><MediaElementEditor element={element} eventId="event" viewport="desktop" mode="appearance" resolvedMedia={{}} onMediaResolved={() => undefined} onChange={() => undefined} /></MemoryRouter>);
    const one = mediaElementSchema.parse({ id: "one", type: "media", editorName: "Media 1", items: [images[0]], presentation: { carousel: { autoplay: true } } });
    expect(renderEditor(one)).not.toContain("Show arrows");
    const carousel = mediaElementSchema.parse({ id: "two", type: "media", editorName: "Media 2", items: images, presentation: { mode: "carousel", carousel: { autoplay: true, interval: 5000 } } });
    const html = renderEditor(carousel);
    expect(html).toContain("Show arrows");
    for (const label of ["Autoplay", "Show arrows", "Show dots", "Loop"]) expect(html).toMatch(new RegExp(`<button[^>]*role="switch"[^>]*aria-checked="true"[^>]*data-slot="switch"[^>]*aria-label="${label}"`));
    expect(html).toContain('aria-label="Autoplay interval in seconds"');
    expect(html).toContain('min="2"');
    expect(html).toContain('max="15"');
    expect(html).toContain('step="1"');
    expect(html).toContain('value="5"');
    expect(html).toContain("seconds");
    expect(html).not.toContain('value="5000"');
    expect(carousel.presentation?.carousel?.autoplay).toBe(true);

    const defaulted = mediaElementSchema.parse({ id: "defaulted", type: "media", editorName: "Media 3", items: images, presentation: { mode: "carousel" } });
    const defaultHtml = renderEditor(defaulted);
    expect(defaultHtml).toMatch(/aria-label="Autoplay interval in seconds"[^>]*disabled=""[^>]*value="5"/);
    expect(defaulted.presentation?.carousel?.interval).toBeUndefined();

    const paused = mediaElementSchema.parse({ id: "paused", type: "media", editorName: "Media 4", items: images, presentation: { mode: "carousel", carousel: { autoplay: false, interval: 3000, arrows: false, dots: false, loop: false } } });
    const pausedHtml = renderEditor(paused);
    for (const label of ["Autoplay", "Show arrows", "Show dots", "Loop"]) expect(pausedHtml).toMatch(new RegExp(`<button[^>]*role="switch"[^>]*aria-checked="false"[^>]*data-slot="switch"[^>]*aria-label="${label}"`));
    expect(pausedHtml).toMatch(/aria-label="Autoplay interval in seconds"[^>]*disabled=""[^>]*value="3"/);
    expect(paused.presentation?.carousel).toEqual({ autoplay: false, interval: 3000, arrows: false, dots: false, loop: false });
  });

  it("converts whole autoplay seconds to canonical milliseconds", () => {
    expect(carouselIntervalSeconds(undefined)).toBe(5);
    expect(carouselIntervalSeconds(3000)).toBe(3);
    expect(carouselIntervalMilliseconds("2")).toBe(2000);
    expect(carouselIntervalMilliseconds("15")).toBe(15000);
    for (const invalid of ["", "1", "16", "2.5", "3.7", "abc"]) expect(carouselIntervalMilliseconds(invalid)).toBeUndefined();
  });

  it("uses unique focal zoom IDs", () => {
    const element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: images });
    const asset = (id: string) => ({ id, originalFilename: `${id}.jpg`, width: 100, height: 100, web: { width: 100, height: 100, url: `/${id}.jpg` } });
    const html = renderToStaticMarkup(<MemoryRouter><MediaElementEditor element={element} eventId="event" viewport="desktop" mode="content" resolvedMedia={{ [first]: asset(first), [second]: asset(second) }} onMediaResolved={() => undefined} onChange={() => undefined} /></MemoryRouter>);
    expect(html).toContain('id="media-one-zoom"');
    expect(html).toContain('id="media-two-zoom"');
  });

  it("uses the effective viewport crop ratio and disables dormant Contain controls without writing", () => {
    const element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: [{ ...images[0], focalPoint: { x: 0.7, y: 0.3 }, zoom: 1.5 }], presentation: { aspectRatio: "wide", fit: "contain", responsive: { tablet: { aspectRatio: "square" }, mobile: { aspectRatio: "portrait" } } } });
    const asset = { id: first, originalFilename: "photo.jpg", width: 1200, height: 800, web: { width: 1200, height: 800, url: "/photo.jpg" } };
    const onChange = vi.fn();
    for (const [viewport, ratio] of [["desktop", "16 / 9"], ["tablet", "1 / 1"], ["mobile", "3 / 4"]] as const) {
      const html = renderToStaticMarkup(<MemoryRouter><MediaElementEditor element={element} eventId="event" viewport={viewport} mode="content" resolvedMedia={{ [first]: asset }} onMediaResolved={() => undefined} onChange={onChange} /></MemoryRouter>);
      expect(html).toContain(`aspect-ratio:${ratio}`);
      expect(html).toContain("Crop controls apply to Cover");
      expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Choose image focal point with pointer or arrow keys"/);
      expect(html).toMatch(/<input[^>]*type="range"[^>]*min="1"[^>]*max="3"[^>]*step="0.1"[^>]*disabled=""[^>]*value="1.5"/);
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(element.items[0]).toMatchObject({ focalPoint: { x: 0.7, y: 0.3 }, zoom: 1.5 });
  });

  it("stores framing sparsely and resets only source-relative crop state on replacement", () => {
    const element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Named Media", isHidden: true, items: [{ ...images[0], focalPoint: { x: 0.7, y: 0.3 }, zoom: 1.5 }], presentation: { aspectRatio: "wide" }, appearance: { corners: "soft" } });
    expect(setMediaImageFraming(element, "one", { x: 0.5, y: 0.5 }, 1).items[0]).not.toHaveProperty("focalPoint");
    expect(setMediaImageFraming(element, "one", { x: 0.5, y: 0.5 }, 1).items[0]).not.toHaveProperty("zoom");
    const clamped = setMediaImageFraming(element, "one", { x: -1, y: 2 }, 4);
    expect(clamped.items[0]).toMatchObject({ focalPoint: { x: 0, y: 1 }, zoom: 3 });

    const replacement = replaceMediaImageSource(element, "one", second, "Replacement");
    expect(replacement).toMatchObject({ id: "media", editorName: "Named Media", isHidden: true, presentation: { aspectRatio: "wide" }, appearance: { corners: "soft" } });
    expect(replacement.items[0]).toEqual({ id: "one", type: "image", mediaId: second, alt: "Replacement" });

    const decorative = mediaElementSchema.parse({ ...element, items: [{ ...element.items[0], decorative: true, alt: "" }] });
    expect(replaceMediaImageSource(decorative, "one", second, "Replacement").items[0]).toEqual({ id: "one", type: "image", mediaId: second, alt: "", decorative: true });
  });

  it("validates direct video editor drafts without broadening the canonical contract", () => {
    expect(directVideoUrlIssue("")).toBe("Enter a direct video URL.");
    expect(directVideoUrlIssue("not a url")).toBe("Enter a valid video URL.");
    expect(directVideoUrlIssue("http://example.com/video.mp4")).toBe("Video URLs must use HTTPS.");
    expect(directVideoUrlIssue(" https://example.com/video.mp4 ")).toBeNull();
    const providerIssue = "Direct video file required. YouTube and Vimeo links aren't supported.";
    for (const url of ["https://youtube.com/watch?v=abc", "https://www.youtube.com/shorts/abc", "https://studio.youtube.com/video/abc", "https://youtu.be/abc", "https://vimeo.com/123", "https://player.vimeo.com/video/123"]) {
      expect(directVideoUrlIssue(url)).toBe(providerIssue);
      expect(mediaElementSchema.safeParse({ id: "media", type: "media", editorName: "Media 1", items: [{ id: "clip", type: "video", url }] }).success).toBe(false);
    }
    for (const url of ["https://cdn.example.com/source", "https://cdn.example.com/source?token=signed&expires=123"]) {
      expect(directVideoUrlIssue(url)).toBeNull();
      expect(mediaElementSchema.safeParse({ id: "media", type: "media", editorName: "Media 1", items: [{ id: "clip", type: "video", url }] }).success).toBe(true);
    }
  });

  it("keeps decorative transitions canonically valid", () => {
    const meaningful = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Media 1", items: [images[0]] });
    const decorative = setMediaImageDecorative(meaningful, "one", true, "First");
    expect(decorative.items[0]).toMatchObject({ decorative: true, alt: "" });
    expect(mediaElementSchema.safeParse(decorative).success).toBe(true);
    const restored = setMediaImageDecorative(decorative, "one", false, "First");
    expect(restored.items[0]).toMatchObject({ decorative: false, alt: "First" });
    expect(mediaElementSchema.safeParse(restored).success).toBe(true);
    expect(setMediaImageDecorative(decorative, "one", false, "   ").items[0]).toMatchObject({ decorative: false, alt: "Image" });
  });

  it("renders meaningful and decorative alt semantics without editor chrome", () => {
    const asset = (id: string) => ({ id, originalFilename: `${id}.jpg`, width: 100, height: 100, web: { width: 100, height: 100, url: `/${id}.jpg` } });
    const element = mediaElementSchema.parse({ id: "media", type: "media", editorName: "Private editor name", items: [images[0], { ...images[1], decorative: true, alt: "" }], presentation: { mode: "carousel" } });
    const firstMarkup = renderToStaticMarkup(<MediaElementRenderer element={element} viewport="desktop" media={{ [first]: asset(first), [second]: asset(second) }} />);
    expect(firstMarkup).toContain('alt="First"');
    expect(firstMarkup).not.toContain("Private editor name");
    expect(firstMarkup).not.toContain("Media unavailable");
    const decorativeSingle = renderToStaticMarkup(<MediaElementRenderer element={{ ...element, items: [{ ...images[1], decorative: true, alt: "" }], presentation: undefined }} viewport="desktop" media={{ [second]: asset(second) }} />);
    expect(decorativeSingle).toContain('alt=""');
    expect(decorativeSingle).not.toContain("data-editor-");
  });

  it("keeps image and video content controls relevant and item-aware", () => {
    const asset = { id: first, originalFilename: "portrait.jpg", width: 100, height: 100, web: { width: 100, height: 100, url: "/portrait.jpg" } };
    const image = mediaElementSchema.parse({ id: "image-media", type: "media", editorName: "Media 1", items: [images[0]] });
    const imageEditor = renderToStaticMarkup(<MemoryRouter><MediaElementEditor element={image} eventId="event" viewport="desktop" mode="content" resolvedMedia={{ [first]: asset }} onMediaResolved={() => undefined} onChange={() => undefined} /></MemoryRouter>);
    expect(imageEditor).toContain('aria-label="Alt text"');
    expect(imageEditor).toContain("Decorative image");
    expect(imageEditor).toMatch(/role="switch" aria-checked="false"[^>]*aria-label="Decorative image"/);
    expect(imageEditor).toContain('aria-label="Remove image 1"');
    expect(imageEditor).not.toContain("Show video controls");

    const video = mediaElementSchema.parse({ id: "video-media", type: "media", editorName: "Media 2", items: [{ id: "clip", type: "video", url: "https://example.com/video.mp4", controls: true }] });
    const videoEditor = renderToStaticMarkup(<MemoryRouter><MediaElementEditor element={video} eventId="event" viewport="desktop" mode="content" resolvedMedia={{}} onMediaResolved={() => undefined} onChange={() => undefined} /></MemoryRouter>);
    expect(videoEditor).toContain('aria-label="Direct video URL"');
    expect(videoEditor).toContain("Show video controls");
    expect(videoEditor).toMatch(/role="switch" aria-checked="true"[^>]*aria-label="Show video controls"/);
    expect(videoEditor).toContain('aria-label="Remove video 1"');
    expect(videoEditor).not.toContain('aria-label="Alt text"');
    expect(videoEditor).not.toContain("Choose image focal point");
    expect(videoEditor).not.toContain("Duplicate video");
  });

  it("keeps native video load failures editor-only", () => {
    const video = mediaElementSchema.parse({ id: "video-media", type: "media", editorName: "Private video", items: [{ id: "clip", type: "video", url: "https://example.com/video.mp4", controls: true }] });
    const publicMarkup = renderToStaticMarkup(<MediaElementRenderer element={video} viewport="desktop" media={{}} />);
    expect(publicMarkup).toContain("<video");
    expect(publicMarkup).toContain("playsInline");
    expect(publicMarkup).not.toContain('aria-label="Video"');
    expect(publicMarkup).not.toContain("data-media-video-error");
    expect(publicMarkup).not.toContain("Private video");
    expect(shouldShowMediaVideoLoadError("editor", true)).toBe(true);
    expect(shouldShowMediaVideoLoadError("public", true)).toBe(false);
    expect(shouldShowMediaVideoLoadError("editor", false)).toBe(false);
  });
});
