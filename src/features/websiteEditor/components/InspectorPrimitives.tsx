import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";

export function InspectorSection({ title, description, children, className = "" }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return <section className={`space-y-3 border-b border-border pb-5 last:border-b-0 ${className}`}><div><h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">{title}</h3>{description && <p className="mt-1 text-xs text-foreground-muted">{description}</p>}</div>{children}</section>;
}

export function InspectorField({ label, status, children }: { label: string; status?: string; children: React.ReactNode }) {
  return <div><div className="mb-1.5 flex items-center justify-between gap-2"><span className="text-xs font-medium">{label}</span>{status && <span className="text-[10px] font-medium text-foreground-muted">{status}</span>}</div>{children}</div>;
}

export function InspectorDisclosure({ title, summary, defaultOpen = false, open: controlledOpen, onOpenChange, actions, children }: { title: string; summary: string; defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; actions?: React.ReactNode; children: React.ReactNode }) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const regionId = useId();
  const open = controlledOpen ?? localOpen;
  const toggle = () => { const next = !open; if (controlledOpen === undefined) setLocalOpen(next); onOpenChange?.(next); };
  return <section className="border-b border-border last:border-b-0"><div className="flex min-w-0 items-center gap-1"><button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-sm py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/30" aria-expanded={open} aria-controls={regionId} onClick={toggle}><ChevronDown size={14} className={`shrink-0 text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{title}</span><span className="block truncate text-[11px] text-foreground-muted">{summary}</span></span></button>{actions && <span className="relative z-10 flex shrink-0 items-center">{actions}</span>}</div>{open && <div id={regionId} className="space-y-3 pb-3 pl-[22px]">{children}</div>}</section>;
}

export function InspectorResetAction({ label = "Reset", onClick }: { label?: string; onClick: () => void }) {
  return <Button size="sm" variant="ghost" type="button" onClick={onClick}>{label}</Button>;
}
