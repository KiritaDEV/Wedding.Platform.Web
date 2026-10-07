import type { CSSProperties } from "react";
import type { GalleryItem, ResolvedWebsiteMedia, ResponsiveViewport, WebsiteSectionAppearance } from "../websiteEditor/types";
import { ZoomedMediaImage } from "./ZoomedMediaImage";
import { resolveGalleryGridAppearance } from "./galleryGridAppearance";
import { useWebsiteElementChange } from "./WebsiteElementChangeContext";
import { SURFACE_RADIUS_CSS, SURFACE_SHADOW_CSS } from "./surfaceEffects";
import { INNER_SPACING_CSS, resolveInnerSpacing } from "../websiteElements/group";
import { galleryItemAnimationAsAuthored, GALLERY_ANIMATION_STAGGER_MS } from "../websiteAnimation/contract";
import { resolveGalleryItemAnimation } from "../websiteAnimation/resolve";
import { galleryItemMotionOwnerId, galleryItemsMotionOwnerId } from "../websiteAnimation/identity";
import { WebsiteMotion } from "../websiteAnimation/runtime";

export function GalleryCollectionRenderer({ items, media, appearance, viewport, mode, sectionId }: {
  sectionId?: string;
  items: GalleryItem[];
  media: Record<string, ResolvedWebsiteMedia>;
  appearance: WebsiteSectionAppearance;
  viewport: ResponsiveViewport;
  mode: "editor" | "public";
}) {
  const { onGalleryAdd } = useWebsiteElementChange();
  const renderedItems = mode === "editor" ? items : items.filter(({ mediaId }) => Boolean(media[mediaId]));
  const innerSpacing = resolveInnerSpacing(appearance.galleryContentInnerSpacing, undefined);
  const contentStyle = { paddingTop: INNER_SPACING_CSS[innerSpacing.top ?? "none"], paddingRight: INNER_SPACING_CSS[innerSpacing.right ?? "none"], paddingBottom: INNER_SPACING_CSS[innerSpacing.bottom ?? "none"], paddingLeft: INNER_SPACING_CSS[innerSpacing.left ?? "none"] };
  if (renderedItems.length === 0) {
    return mode === "editor" ? (
      <div data-gallery-content className="box-border w-full" style={contentStyle}>
        <div data-gallery-collection data-gallery-empty className="grid min-h-32 w-full place-items-center rounded-lg border border-dashed border-current/30 px-6 text-center text-sm opacity-75">
          {sectionId ? <button type="button" className="rounded border px-3 py-2" onClick={event => {
            event.stopPropagation();
            onGalleryAdd?.(sectionId);
          }}>Add images</button> : "Gallery images will appear here"}
        </div>
      </div>
    ) : null;
  }
  const grid = resolveGalleryGridAppearance(appearance, viewport);
  const itemAnimation = resolveGalleryItemAnimation(appearance, viewport);
  const motionAnimation = galleryItemAnimationAsAuthored(itemAnimation);
  const staggerMs = GALLERY_ANIMATION_STAGGER_MS[itemAnimation?.entrance?.stagger ?? "none"];
  return (
    <div data-gallery-content className="box-border w-full" style={contentStyle}>
      <div
        data-gallery-collection
        data-gallery-columns={grid.columns}
        data-gallery-gap={grid.gapToken}
        data-gallery-aspect-ratio={grid.aspectRatioToken}
        className="grid w-full min-w-0 max-w-full"
        style={{ gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`, gap: grid.gap } as CSSProperties}
      >
      {renderedItems.map((item, order) => {
        const asset = media[item.mediaId];
        const tile = <div key={item.id} data-gallery-item={item.id} className="w-full min-w-0 overflow-hidden" style={{ aspectRatio: grid.aspectRatio, borderRadius: SURFACE_RADIUS_CSS[appearance.radius ?? "square"], boxShadow: SURFACE_SHADOW_CSS[appearance.shadow ?? "none"] }}>
            {asset ? (
              <ZoomedMediaImage
                className="h-full w-full"
                src={asset.web.url}
                width={asset.web.width}
                height={asset.web.height}
                reference={item}
                alt=""
              />
            ) : (
              <div data-gallery-media-unavailable className="grid h-full w-full place-items-center bg-surface-muted px-3 text-center text-sm text-foreground-muted">
                Media unavailable
              </div>
            )}
          </div>;
        return sectionId ? <WebsiteMotion key={item.id} ownerId={galleryItemMotionOwnerId(sectionId, item.id)} animation={motionAnimation} batch={{ ownerId: galleryItemsMotionOwnerId(sectionId), order, staggerMs }} galleryItemId={item.id} className="min-w-0 max-w-full">{tile}</WebsiteMotion> : tile;
      })}
      </div>
    </div>
  );
}
