import type { ResponsiveViewport, WebsiteSectionAppearance } from "../types";
import { Select } from "../../../components/ui/Select";
import { InspectorResetAction, InspectorSection } from "./InspectorPrimitives";
import { resolveGalleryGridAppearance } from "../../websiteRenderer/galleryGridAppearance";

export function GalleryAppearanceControls({ appearance, viewport, onChange }: {
  appearance: WebsiteSectionAppearance;
  viewport: ResponsiveViewport;
  onChange: (appearance: WebsiteSectionAppearance) => void;
}) {
  const grid = resolveGalleryGridAppearance(appearance, viewport);
  const reset = (key: "columns" | "gap" | "aspectRatio") => {
    const next = { ...appearance };
    delete next[key];
    onChange(next);
  };
  const fields = [
    { key: "columns" as const, label: "Columns", value: String(grid.columns), options: Array.from({ length: 6 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })) },
    { key: "gap" as const, label: "Gap", value: grid.gapToken, options: ["small", "medium", "large"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
    { key: "aspectRatio" as const, label: "Aspect ratio", value: grid.aspectRatioToken, options: ["square", "portrait", "landscape"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
  ];
  return <InspectorSection title="Gallery" description="Uniform grid layout for the current Section appearance owner.">
    {fields.map(field => <div key={field.key} className="space-y-2">
      <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{field.label}</span>{appearance[field.key] !== undefined && <InspectorResetAction label={`Reset ${field.label.toLowerCase()}`} onClick={() => reset(field.key)} />}</div>
      <Select aria-label={field.label} value={field.value} options={field.options} onChange={value => onChange({ ...appearance, [field.key]: field.key === "columns" ? Number(value) : value })} />
    </div>)}
  </InspectorSection>;
}
