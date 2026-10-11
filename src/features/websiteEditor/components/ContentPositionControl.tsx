import { HERO_CONTENT_POSITIONS, type HeroContentPosition } from "../../websiteRenderer/heroContentPosition";

const labels: Record<HeroContentPosition, string> = { 'top-start': 'Top Left', 'top-center': 'Top Center', 'top-end': 'Top Right', 'center-start': 'Center Left', center: 'Center', 'center-end': 'Center Right', 'bottom-start': 'Bottom Left', 'bottom-center': 'Bottom Center', 'bottom-end': 'Bottom Right' };

export function ContentPositionControl({ value, onChange }: { value: HeroContentPosition; onChange: (value: HeroContentPosition) => void }) {
  return <div className="grid grid-cols-3 gap-1" role="group" aria-label="Content position">{HERO_CONTENT_POSITIONS.map((position) => <button key={position} type="button" title={labels[position]} aria-label={labels[position]} aria-pressed={value === position} className={`grid h-9 place-items-center rounded-sm border ${value === position ? 'border-accent bg-surface-muted' : 'border-border bg-background'}`} onClick={() => onChange(position)}><span className="size-2 rounded-full bg-current" /></button>)}</div>;
}
