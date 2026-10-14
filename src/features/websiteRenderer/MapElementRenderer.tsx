import { SURFACE_SHADOW_CSS } from "./surfaceEffects";
import type { MapElement } from "../websiteElements/types";
import { validateGoogleMapsUrl } from "../websiteElements/googleMaps";

const MAP_WIDTHS = { small: 320, medium: 480, large: 640, full: "100%" } as const;
const MAP_HEIGHTS = { small: 240, medium: 360, large: 480 } as const;
const MAP_RADII = { none: 0, small: 8, medium: 16, large: 24 } as const;

export function MapElementRenderer({ element, mode = "public" }: { element: MapElement; mode?: "editor" | "public" }) {
  const src = element.embedUrl && validateGoogleMapsUrl(element.embedUrl);
  if (!src && mode !== "editor") return null;
  const appearance = element.appearance;
  return <div data-map-block style={{ width: "100%", maxWidth: MAP_WIDTHS[appearance?.width ?? "full"], marginInlineStart: appearance?.alignment === "start" ? 0 : "auto", marginInlineEnd: appearance?.alignment === "end" ? 0 : "auto", minWidth: 0, height: MAP_HEIGHTS[appearance?.height ?? "medium"], borderRadius: MAP_RADII[appearance?.cornerRadius ?? "medium"], boxShadow: SURFACE_SHADOW_CSS[appearance?.shadow ?? "none"], overflow: "hidden", position: "relative", textAlign: appearance?.alignment ?? "center" }}>
    {src ? <iframe src={src} title="Location on Google Maps" width="100%" height="100%" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen tabIndex={mode === "editor" ? -1 : undefined} style={{ display: "block", width: "100%", maxWidth: "100%", height: "100%", border: 0, pointerEvents: mode === "editor" ? "none" : "auto" }} /> : <div role="status" className="flex h-full items-center justify-center bg-surface-muted p-4 text-sm text-foreground-muted">Paste a Google Maps embed in the inspector.</div>}
  </div>;
}
