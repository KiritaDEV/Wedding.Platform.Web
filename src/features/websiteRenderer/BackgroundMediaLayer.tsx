import type { ResolvedWebsiteMedia, ResponsiveViewport, SectionMedia } from "../websiteEditor/types";
import { resolveBackgroundMediaForDevice } from "../websiteMedia/backgroundMedia";
import { ZoomedMediaImage } from "./ZoomedMediaImage";

export function BackgroundMediaLayer({ reference, media, viewport, opacity = 100, kind, ownerId }: { reference?: SectionMedia; media: Record<string, ResolvedWebsiteMedia>; viewport: ResponsiveViewport; opacity?: number; kind: "hero" | "group"; ownerId: string }) {
  const effective = resolveBackgroundMediaForDevice(reference, viewport);
  const asset = effective ? media[effective.assetId] : undefined;
  if (!effective || !asset) return null;
  return <div data-background-media-layer data-background-owner={ownerId} data-hero-background-image={kind === "hero" || undefined} data-group-background-image={kind === "group" || undefined} className={`pointer-events-none absolute inset-0${kind === "group" ? " overflow-hidden" : ""}`} style={{ opacity: opacity / 100 }} aria-hidden="true">
    <ZoomedMediaImage alt="" fill className="h-full w-full" height={asset.web.height} reference={effective} src={asset.web.url} width={asset.web.width} />
  </div>;
}
