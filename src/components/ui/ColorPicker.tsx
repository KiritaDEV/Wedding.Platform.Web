import { useId, useRef, useState } from "react";
import { Input } from "./Input";

type Hsv = { h: number; s: number; v: number };
const OPAQUE_HEX = /^#[0-9A-Fa-f]{6}$/;

export function ColorPicker({ value, onChange, label = "Custom color", id }: { value: string; onChange: (value: string) => void; label?: string; id?: string }) {
  const generatedId = useId();
  const idBase = id ?? `color-picker-${generatedId}`;
  const normalized = normalizeHex(value) ?? "#FFFFFF";
  const hsv = hexToHsv(normalized);
  const [hexInput, setHexInput] = useState(normalized);
  const [editingHex, setEditingHex] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  const commitHsv = (next: Hsv) => {
    const clamped = { h: clamp(next.h, 0, 360), s: clamp(next.s, 0, 100), v: clamp(next.v, 0, 100) };
    const hex = hsvToHex(clamped);
    setHexInput(hex);
    onChange(hex);
  };
  const updateField = (clientX: number, clientY: number) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    commitHsv({ ...hsv, s: ((clientX - rect.left) / rect.width) * 100, v: (1 - (clientY - rect.top) / rect.height) * 100 });
  };

  return <div className="space-y-3" aria-label={label}>
    <div
      ref={fieldRef}
      className="relative h-36 cursor-crosshair overflow-hidden rounded-md border border-border outline-none focus:ring-2 focus:ring-accent/30"
      style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)`, backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)" }}
      role="slider"
      tabIndex={0}
      aria-label={`${label} saturation and brightness`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(hsv.s)}
      aria-valuetext={`${Math.round(hsv.s)}% saturation, ${Math.round(hsv.v)}% brightness`}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); updateField(event.clientX, event.clientY); }}
      onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateField(event.clientX, event.clientY); }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 10 : 1;
        if (event.key === "ArrowLeft") commitHsv({ ...hsv, s: hsv.s - step });
        else if (event.key === "ArrowRight") commitHsv({ ...hsv, s: hsv.s + step });
        else if (event.key === "ArrowDown") commitHsv({ ...hsv, v: hsv.v - step });
        else if (event.key === "ArrowUp") commitHsv({ ...hsv, v: hsv.v + step });
        else return;
        event.preventDefault();
      }}
    >
      <span className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/45%)]" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }} />
    </div>
    <div>
      <label className="mb-1 block text-xs font-medium" htmlFor={`${idBase}-hue`}>Hue</label>
      <input id={`${idBase}-hue`} className="h-3 w-full cursor-pointer appearance-none rounded-full border border-border" style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }} type="range" min={0} max={360} value={hsv.h} aria-label={`${label} hue`} onChange={(event) => commitHsv({ ...hsv, h: Number(event.target.value) })} />
    </div>
    <div className="flex items-center gap-2">
      <span className="size-9 shrink-0 rounded-md border border-border" style={{ backgroundColor: normalized }} aria-label={`Current color ${normalized}`} role="img" />
      <div className="min-w-0 flex-1"><label className="mb-1 block text-xs font-medium" htmlFor={`${idBase}-hex`}>Hex</label><Input id={`${idBase}-hex`} value={editingHex ? hexInput : normalized} aria-label={`${label} hex value`} maxLength={7} spellCheck={false} onFocus={() => { setHexInput(normalized); setEditingHex(true); }} onChange={(event) => { const next = event.target.value; setHexInput(next); const valid = normalizeHex(next); if (valid) onChange(valid); }} onBlur={() => setEditingHex(false)} /></div>
    </div>
  </div>;
}

function normalizeHex(value: string): string | null { return OPAQUE_HEX.test(value) ? value.toUpperCase() : null; }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function hexToHsv(hex: string): Hsv {
  const [r, g, b] = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const h = delta === 0 ? 0 : max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
  return { h: h < 0 ? h + 360 : h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}
function hsvToHex({ h, s, v }: Hsv): string {
  const saturation = s / 100, value = v / 100, chroma = value * saturation, x = chroma * (1 - Math.abs(((h / 60) % 2) - 1)), match = value - chroma;
  const [r, g, b] = h < 60 ? [chroma, x, 0] : h < 120 ? [x, chroma, 0] : h < 180 ? [0, chroma, x] : h < 240 ? [0, x, chroma] : h < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return `#${[r, g, b].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
