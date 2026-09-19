import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GalleryCollectionRenderer } from "./GalleryCollectionRenderer";
import { resolveGalleryGridAppearance } from "./galleryGridAppearance";
import type { GalleryItem, ResolvedWebsiteMedia, WebsiteSectionAppearance } from "../websiteEditor/types";

const appearance: WebsiteSectionAppearance = { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit" };
const asset = (id: string, width = 1200, height = 800): ResolvedWebsiteMedia => ({ id, originalFilename: `${id}.jpg`, width, height, web: { width, height, url: `/${id}.jpg` } });
const item = (id: string, extra: Partial<GalleryItem> = {}): GalleryItem => ({ id, type: "image", mediaId: id, ...extra });

describe("GalleryCollectionRenderer", () => {
  it("uses canonical viewport defaults and authored appearance", () => {
    expect(resolveGalleryGridAppearance(appearance, "mobile")).toEqual({ columns: 1, gapToken: "medium", aspectRatioToken: "portrait", gap: "1.25rem", aspectRatio: "4 / 5" });
    expect(resolveGalleryGridAppearance(appearance, "tablet").columns).toBe(2);
    expect(resolveGalleryGridAppearance(appearance, "desktop").columns).toBe(3);
    expect(resolveGalleryGridAppearance({ ...appearance, columns: 6, gap: "large", aspectRatio: "landscape" }, "mobile")).toEqual({ columns: 6, gapToken: "large", aspectRatioToken: "landscape", gap: "2rem", aspectRatio: "4 / 3" });
  });

  it("renders resolved images in semantic order with cover framing and empty alt text", () => {
    const items = [item("a", { focalPoint: { x: 0, y: 0 }, zoom: 2 }), item("b"), item("c")];
    const media = Object.fromEntries(items.map(({ mediaId }) => [mediaId, asset(mediaId)]));
    const html = renderToStaticMarkup(<GalleryCollectionRenderer items={items} media={media} appearance={{ ...appearance, columns: 3, gap: "small", aspectRatio: "square" }} viewport="desktop" mode="public" />);
    expect(html).toContain('data-gallery-columns="3"');
    expect(html).toContain('data-gallery-gap="small"');
    expect(html).toContain('data-gallery-aspect-ratio="square"');
    expect(html.indexOf('data-gallery-item="a"')).toBeLessThan(html.indexOf('data-gallery-item="b"'));
    expect(html.indexOf('data-gallery-item="b"')).toBeLessThan(html.indexOf('data-gallery-item="c"'));
    expect(html).toContain('data-media-focal-x="0"');
    expect(html).toContain('data-media-focal-y="0"');
    expect(html).toContain('data-media-zoom="2"');
    expect(html).toContain('alt=""');
    expect(html).not.toMatch(/alt="[^"]+"/);
    expect(html).toContain('object-cover');
    expect(html).not.toContain('role="grid"');
  });

  it("preserves unresolved positions in editor and removes them publicly", () => {
    const items = [item("a"), item("b"), item("c")];
    const media = { a: asset("a"), c: asset("c") };
    const editor = renderToStaticMarkup(<GalleryCollectionRenderer items={items} media={media} appearance={appearance} viewport="desktop" mode="editor" />);
    expect(editor.indexOf('data-gallery-item="a"')).toBeLessThan(editor.indexOf('data-gallery-item="b"'));
    expect(editor.indexOf('data-gallery-item="b"')).toBeLessThan(editor.indexOf('data-gallery-item="c"'));
    expect(editor).toContain("Media unavailable");
    const published = renderToStaticMarkup(<GalleryCollectionRenderer items={items} media={media} appearance={appearance} viewport="desktop" mode="public" />);
    expect(published).not.toContain('data-gallery-item="b"');
    expect(published).not.toContain("Media unavailable");
  });

  it("renders an incomplete draft image with an empty alt and invents no description", () => {
    const incomplete: GalleryItem = { id: "incomplete", type: "image", mediaId: "private-filename" };
    const html = renderToStaticMarkup(<GalleryCollectionRenderer items={[incomplete]} media={{ "private-filename": asset("private-filename") }} appearance={appearance} viewport="desktop" mode="public" />);

    expect(html).toContain('data-gallery-item="incomplete"');
    expect(html).toContain('alt=""');
    expect(html).not.toContain('alt="private-filename.jpg"');
    expect(html).not.toContain('alt="Website"');
  });

  it("uses one shared editor empty state and emits no public wrapper for empty or unresolved collections", () => {
    const editor = renderToStaticMarkup(<GalleryCollectionRenderer items={[]} media={{}} appearance={appearance} viewport="mobile" mode="editor" />);
    expect(editor).toContain("data-gallery-empty");
    expect(editor).toContain("Gallery images will appear here");
    expect(renderToStaticMarkup(<GalleryCollectionRenderer items={[]} media={{}} appearance={appearance} viewport="mobile" mode="public" />)).toBe("");
    expect(renderToStaticMarkup(<GalleryCollectionRenderer items={[item("missing")]} media={{}} appearance={appearance} viewport="mobile" mode="public" />)).toBe("");
  });

  it.each([1, 2, 3, 7, 24])("renders %s items without filler cells", (count) => {
    const items = Array.from({ length: count }, (_, index) => item(`item-${index}`));
    const media = Object.fromEntries(items.map(({ mediaId }) => [mediaId, asset(mediaId)]));
    const html = renderToStaticMarkup(<GalleryCollectionRenderer items={items} media={media} appearance={appearance} viewport="desktop" mode="public" />);
    expect((html.match(/data-gallery-item=/g) ?? [])).toHaveLength(count);
  });
});
