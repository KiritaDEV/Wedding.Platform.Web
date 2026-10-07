import type { ResponsiveViewport, WebsiteSectionAppearance } from "../types";
import { Select } from "../../../components/ui/Select";
import { InspectorResetAction, InspectorSection } from "./InspectorPrimitives";
import { resolveGalleryGridAppearance } from "../../websiteRenderer/galleryGridAppearance";
import { SURFACE_RADII, SURFACE_SHADOWS } from "../../websiteRenderer/surfaceEffects";
import { FourSidedSpacingControl } from "./FourSidedSpacingControl";
import { resolveInnerSpacing, type InnerSpacing } from "../../websiteElements/group";
import type { GalleryItemAnimation } from "../../websiteAnimation/contract";
import { GalleryItemAnimationControls } from "./GalleryItemAnimationControls";

export function GalleryAppearanceControls({ appearance, viewport, onChange, itemAnimation, effectiveItemAnimation, exactDevice = false, itemAnimationConflict, itemAnimationReplayed, onItemAnimationChange, onItemAnimationReset, onItemAnimationReplay }: {
  appearance: WebsiteSectionAppearance;
  viewport: ResponsiveViewport;
  onChange: (appearance: WebsiteSectionAppearance) => void;
  itemAnimation?: GalleryItemAnimation; effectiveItemAnimation?: GalleryItemAnimation; exactDevice?: boolean; itemAnimationConflict?: string; itemAnimationReplayed?: boolean;
  onItemAnimationChange?: (value: GalleryItemAnimation | undefined) => void; onItemAnimationReset?: () => void; onItemAnimationReplay?: () => void;
}) {
  const grid = resolveGalleryGridAppearance(appearance, viewport);
  const innerSpacing = resolveInnerSpacing(appearance.galleryContentInnerSpacing, undefined);
  const reset = (key: "columns" | "gap" | "aspectRatio" | "radius" | "shadow") => {
    const next = { ...appearance };
    delete next[key];
    onChange(next);
  };
  const setInnerSpacing = (changes: Partial<InnerSpacing>) => {
    const next = { ...appearance };
    const value = { ...appearance.galleryContentInnerSpacing };
    for (const [side, spacing] of Object.entries(changes)) {
      if (spacing === "none") delete value[side as keyof InnerSpacing];
      else value[side as keyof InnerSpacing] = spacing;
    }
    if (Object.keys(value).length) next.galleryContentInnerSpacing = value;
    else delete next.galleryContentInnerSpacing;
    onChange(next);
  };
  const fields = [
    { key: "columns" as const, label: "Columns", value: String(grid.columns), options: Array.from({ length: 6 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })) },
    { key: "gap" as const, label: "Gap", value: grid.gapToken, options: ["small", "medium", "large"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
    { key: "aspectRatio" as const, label: "Aspect ratio", value: grid.aspectRatioToken, options: ["square", "portrait", "landscape"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
    { key: "radius" as const, label: "Radius", value: appearance.radius ?? "square", options: SURFACE_RADII.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
    { key: "shadow" as const, label: "Shadow", value: appearance.shadow ?? "none", options: SURFACE_SHADOWS.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
  ];
  return <InspectorSection title="Gallery" description="Uniform grid layout for the current Section appearance owner.">
    {fields.map(field => <div key={field.key} className="space-y-2">
      <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{field.label}</span>{appearance[field.key] !== undefined && <InspectorResetAction label={`Reset ${field.label.toLowerCase()}`} onClick={() => reset(field.key)} />}</div>
      <Select aria-label={field.label} value={field.value} options={field.options} onChange={value => onChange({ ...appearance, [field.key]: field.key === "columns" ? Number(value) : value })} />
    </div>)}
    <fieldset>
      <legend className="mb-2 text-sm font-semibold xl:text-xs!">Inner spacing</legend>
      <FourSidedSpacingControl spacing={innerSpacing} onChange={setInnerSpacing} />
    </fieldset>
    {onItemAnimationChange && onItemAnimationReplay && <GalleryItemAnimationControls authored={itemAnimation} effective={effectiveItemAnimation} exactDevice={exactDevice} conflict={itemAnimationConflict} replayed={itemAnimationReplayed} onChange={onItemAnimationChange} onReset={onItemAnimationReset} onReplay={onItemAnimationReplay} />}
  </InspectorSection>;
}
