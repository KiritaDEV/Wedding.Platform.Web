import { HERO_CONTENT_POSITIONS, type HeroContentPosition } from "../../websiteRenderer/heroContentPosition";

const labels: Record<HeroContentPosition, string> = { 'top-start': 'Top Left', 'top-center': 'Top Center', 'top-end': 'Top Right', 'center-start': 'Center Left', center: 'Center', 'center-end': 'Center Right', 'bottom-start': 'Bottom Left', 'bottom-center': 'Bottom Center', 'bottom-end': 'Bottom Right' };

export function ContentPositionControl({ value, onChange, horizontalOnly = false }: { value: HeroContentPosition; onChange: (value: HeroContentPosition) => void; horizontalOnly?: boolean }) {
  const vertical = value === "center" ? "center" : value.split("-")[0];
  const positions = horizontalOnly ? HERO_CONTENT_POSITIONS.filter((position) => (position === "center" ? "center" : position.split("-")[0]) === vertical) : HERO_CONTENT_POSITIONS;
  const label = (position: HeroContentPosition) => horizontalOnly ? (position.endsWith("start") ? "Left" : position.endsWith("end") ? "Right" : "Center") : labels[position];
  return <div className="grid grid-cols-3 gap-1" role="group" aria-label={horizontalOnly ? "Horizontal alignment" : "Content position"}>{positions.map((position) => <button key={position} type="button" title={label(position)} aria-label={label(position)} aria-pressed={value === position} className={`grid h-9 place-items-center rounded-sm border ${value === position ? 'border-accent bg-surface-muted' : 'border-border bg-background'}`} onClick={() => onChange(position)}><span className="size-2 rounded-full bg-current" /></button>)}</div>;
}
