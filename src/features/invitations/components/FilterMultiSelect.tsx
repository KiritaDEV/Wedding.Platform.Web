import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Option = { value: string; label: string }

export function FilterMultiSelect({ allLabel, groupLabel, options, values, onChange }: { allLabel: string; groupLabel: string; options: Option[]; values: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const pointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', pointer); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key) }
  }, [open])
  const toggle = (value: string) => onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  return <div ref={root} className="relative min-w-0">
    <button type="button" className="flex min-h-10 w-full items-center justify-between gap-2 rounded-sm border border-border bg-background px-3 py-2 text-left text-sm hover:border-foreground-muted" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span className="truncate">{values.length ? `${groupLabel} · ${values.length}` : allLabel}</span><ChevronDown size={15} aria-hidden="true" /></button>
    {open && <div role="listbox" aria-multiselectable="true" aria-label={groupLabel} className="absolute z-30 mt-1 max-h-64 w-full min-w-52 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
      {options.map((option) => { const selected = values.includes(option.value); return <button key={option.value} type="button" role="option" aria-selected={selected} className="flex min-h-10 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-surface-muted" onClick={() => toggle(option.value)}><span className={`grid size-4 place-items-center rounded border ${selected ? 'border-accent bg-accent text-accent-foreground' : 'border-border'}`}>{selected && <Check size={12} />}</span><span>{option.label}</span></button> })}
      {values.length > 0 && <button type="button" className="mt-1 min-h-9 w-full border-t border-border px-2 text-left text-sm text-accent hover:bg-surface-muted" onClick={() => onChange([])}>Clear</button>}
    </div>}
  </div>
}
