import { Check } from "lucide-react";
import { SelectableCard } from "../../../components/ui/SelectableCard";
import type { SectionCapability } from "../../websiteCapabilities/types";

export function PresentationPicker({ capability, value, onChange }: {
  capability: SectionCapability;
  value: string;
  onChange: (value: string) => void;
}) {
  return <fieldset>
    <legend className="mb-2 text-sm font-semibold">Presentation</legend>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Section presentation choices">
      {capability.presentations.map((option) => {
        const selected = option.id === value;
        return <SelectableCard
          className="min-h-32 overflow-hidden bg-surface p-3 data-[selected=true]:bg-surface-muted"
          key={option.id}
          selected={selected}
          onClick={() => onChange(option.id)}
        >
          <div className="mb-3 grid grid-cols-[1fr_2.2rem] gap-2" aria-hidden="true">
            <PresentationSchematic kind={option.preview} />
            <PresentationSchematic kind={option.preview} mobile />
          </div>
          <span className="flex items-center justify-between gap-2 text-sm font-semibold">
            {option.displayName}
            {selected && <Check className="shrink-0 text-accent" size={14} />}
          </span>
          <span className="mt-1 block text-xs leading-5 text-foreground-muted">{option.description}</span>
        </SelectableCard>;
      })}
    </div>
  </fieldset>;
}

function PresentationSchematic({ kind, mobile = false }: { kind: string; mobile?: boolean }) {
  const image = "bg-accent/35";
  const text = "bg-foreground-muted/30";
  if (kind === "circles") return <span className="flex h-10 items-center justify-center gap-1 rounded border border-border bg-background">{[0, 1, 2].map((item) => <span className={`${image} ${mobile ? "size-2" : "size-3"} rounded-full`} key={item} />)}</span>;
  if (kind === "cards" || kind === "grid") return <span className={`grid h-10 gap-1 rounded border border-border bg-background p-1 ${mobile ? "grid-cols-1" : "grid-cols-3"}`}>{[0, 1, 2].map((item) => <span className={`${image} ${kind === "cards" ? "rounded-sm" : ""}`} key={item} />)}</span>;
  if (kind === "overlay") return <span className={`relative h-10 overflow-hidden rounded border border-border ${image}`}><span className={`absolute ${mobile ? "inset-x-1 bottom-1 h-2" : "bottom-1 left-2 h-2 w-1/2"} rounded-sm bg-background/80`} /></span>;
  if (kind === "split") return <span className={`grid h-10 gap-1 rounded border border-border bg-background p-1 ${mobile ? "grid-rows-2" : "grid-cols-2"}`}><span className={image} /><span className={`${text} rounded-sm`} /></span>;
  if (kind === "frame") return <span className="grid h-10 place-items-center rounded border border-border bg-background p-1"><span className={`${image} h-full w-4/5 border-2 border-background outline outline-1 outline-border`} /></span>;
  if (kind === "minimal") return <span className="flex h-10 items-center gap-2 rounded border border-border bg-background p-2"><span className={`${image} size-4 rounded-full`} /><span className={`${text} h-2 flex-1 rounded-sm`} /></span>;
  return <span className="flex h-10 flex-col justify-center gap-1.5 rounded border border-border bg-background px-2"><span className={`${text} h-1.5 w-3/4 rounded-sm`} /><span className={`${text} h-1.5 w-1/2 rounded-sm`} /></span>;
}
