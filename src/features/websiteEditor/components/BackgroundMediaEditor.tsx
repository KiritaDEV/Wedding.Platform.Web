import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import type { MediaAsset } from "../../media/types";
import { useEventWorkspace } from "../../events/workspace/EventWorkspaceContext";
import type { ResolvedWebsiteMedia, SectionMedia } from "../types";
import { FocalPointEditor } from "./FocalPointEditor";
import { MediaPickerDialog } from "./MediaPickerDialog";
import { removeBackgroundMediaForDevice, resolveBackgroundMediaForDevice, setBackgroundMediaDeviceFraming, type BackgroundMediaDevice, type BackgroundMediaReference } from "../../websiteMedia/backgroundMedia";
import { useBackgroundMinimumZoom } from "../../websiteMedia/backgroundGeometry";

export function BackgroundMediaEditor({ media, viewport = "desktop", ownerId, resolvedMedia, onMediaResolved, onChange, title = "Image" }: { media?: SectionMedia; viewport?: BackgroundMediaDevice; ownerId?: string; resolvedMedia: Record<string, ResolvedWebsiteMedia>; onMediaResolved: (media: ResolvedWebsiteMedia) => void; onChange: (media: SectionMedia) => void; title?: string }) {
  const event = useEventWorkspace();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chosen, setChosen] = useState<MediaAsset | null>(null);
  const effective = resolveBackgroundMediaForDevice(media, viewport);
  const resolved = effective ? resolvedMedia[effective.assetId] : undefined;
  const chosenMatches = chosen !== null && chosen.id === effective?.assetId;
  const url = chosenMatches ? chosen.variants.web.url : resolved?.web.url;
  const filename = chosenMatches ? chosen.originalFilename : resolved?.originalFilename;
  const point = effective?.focalPoint ?? { x: 0.5, y: 0.5 };
  const update = (patch: Parameters<typeof setBackgroundMediaDeviceFraming>[2]) => media && onChange(setBackgroundMediaDeviceFraming(media as BackgroundMediaReference, viewport, patch));
  const minimumZoom = useBackgroundMinimumZoom(ownerId ? `${ownerId}:${viewport}` : undefined);
  return <section className="rounded-lg border border-border bg-surface-muted p-3">
    <h3 className="text-sm font-semibold">{title}</h3>
    {effective && url ? <div className="mt-3">
      <FocalPointEditor url={url} sourceWidth={resolved?.web.width} sourceHeight={resolved?.web.height} allowZoomOut minimumZoom={minimumZoom} point={point} zoom={effective?.zoom} showReset={viewport === "desktop"} onChange={({ point: focalPoint, zoom }) => update({ focalPoint, zoom })} onPointChange={(focalPoint) => update({ focalPoint })} onZoomChange={(zoom) => update({ zoom })} />
      <p className="mt-1 truncate text-xs text-foreground-muted">{filename}</p>
      <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" type="button" variant="secondary" onClick={() => setPickerOpen(true)}>Change image</Button><Button size="sm" type="button" variant="ghost" onClick={() => { setChosen(null); onChange(removeBackgroundMediaForDevice(media as BackgroundMediaReference, viewport)); }}>Remove image</Button></div>
    </div> : <div className="mt-2"><p className="text-xs text-foreground-muted">No image selected</p><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" type="button" variant="secondary" onClick={() => setPickerOpen(true)}>Change image</Button></div></div>}
  <MediaPickerDialog open={pickerOpen} eventId={event.id} selectedAssetId={effective?.assetId} onClose={() => setPickerOpen(false)} onSelect={(asset) => { setChosen(asset); onMediaResolved({ id: asset.id, originalFilename: asset.originalFilename, width: asset.width, height: asset.height, web: asset.variants.web }); onChange({ assetId: asset.id }); setPickerOpen(false); }} />
  </section>;
}
