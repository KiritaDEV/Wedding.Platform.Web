import { Minus, Plus } from "lucide-react";
import { IconButton } from "../../../components/ui/IconButton";
import { InspectorResetAction } from "./InspectorPrimitives";

export function NumericPercentageControl({ label, subject, value, defaultValue, minimum, maximum, step, defaultLabel, onChange }: {
  label: string;
  subject: string;
  value?: number;
  defaultValue: number;
  minimum: number;
  maximum: number;
  step: number;
  defaultLabel?: string;
  onChange: (value?: number) => void;
}) {
  const effectiveValue = value ?? defaultValue;
  const update = (next: number) => onChange(Math.min(maximum, Math.max(minimum, next)));
  return <fieldset><div className="flex items-center justify-between gap-3"><legend className="text-xs font-medium">{label}</legend><div className="flex items-center gap-1.5"><span className="text-xs tabular-nums text-foreground-muted">{effectiveValue}%{value === undefined && defaultLabel ? ` · ${defaultLabel}` : ''}</span>{value !== undefined && <InspectorResetAction onClick={() => onChange()} />}</div></div><div className="mt-2 flex items-center gap-2"><IconButton type="button" size="sm" aria-label={`Decrease ${subject}`} disabled={effectiveValue <= minimum} onClick={() => update(effectiveValue - step)}><Minus size={16} /></IconButton><input className="w-full cursor-pointer accent-accent" type="range" aria-label={label} min={minimum} max={maximum} step={step} value={effectiveValue} onChange={(event) => update(Number(event.target.value))} /><IconButton type="button" size="sm" aria-label={`Increase ${subject}`} disabled={effectiveValue >= maximum} onClick={() => update(effectiveValue + step)}><Plus size={16} /></IconButton></div></fieldset>;
}
