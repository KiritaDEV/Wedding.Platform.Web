import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Select } from "../../../components/ui/Select";
import { SPACING_PRESETS, type FourSidedSpacing, type SpacingPreset } from "../../websiteElements/spacing";
import { spacingAxisChanges, spacingAxisValue, spacingSideChanges, type SpacingChanges, type SpacingSide } from "./spacingControlModel";

const sideLabels: Record<SpacingSide, string> = { top: "Top", right: "Right", bottom: "Bottom", left: "Left" };
const axisLabels = { vertical: "Vertical spacing", horizontal: "Horizontal spacing" } as const;
const presetLabel = (value: SpacingPreset) => value === "none" ? "None" : value.toUpperCase();

export function FourSidedSpacingControl({ spacing, kind = "Inner", options = SPACING_PRESETS, defaultExpanded = false, onChange }: { spacing?: FourSidedSpacing; kind?: "Inner" | "Outer"; options?: readonly SpacingPreset[]; defaultExpanded?: boolean; onChange: (changes: SpacingChanges) => void }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const selectOptions = options.map((value) => ({ value, label: presetLabel(value) }));
  const row = (label: string, value: SpacingPreset | "mixed", change: (value: SpacingPreset) => void) => <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-3"><span className="text-sm text-foreground">{label}</span><Select aria-label={label} value={value} options={value === "mixed" ? [{ value: "mixed", label: "Mixed", disabled: true }, ...selectOptions] : selectOptions} onChange={(next) => change(next as SpacingPreset)} /></div>;
  return <div className="space-y-2" aria-label={`${kind} spacing controls`}>
    {(["vertical", "horizontal"] as const).map((axis) => <div key={axis}>{row(axisLabels[axis], spacingAxisValue(spacing, axis), (value) => onChange(spacingAxisChanges(axis, value)))}</div>)}
    <button type="button" className="flex min-h-8 w-full items-center gap-1 rounded-sm text-left text-sm text-foreground-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>Customize sides<ChevronRight className={`transition-transform ${expanded ? "rotate-90" : ""}`} size={16} aria-hidden="true" /></button>
    {expanded && <div className="space-y-2 border-t border-border pt-2">{(Object.keys(sideLabels) as SpacingSide[]).map((side) => <div key={side}>{row(sideLabels[side], spacing?.[side] ?? "none", (value) => onChange(spacingSideChanges(side, value)))}</div>)}</div>}
  </div>;
}
