import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '../../../components/ui/IconButton'

export function InvitationActionMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <div className="relative" onClick={(event) => event.stopPropagation()} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <IconButton type="button" size="sm" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><MoreHorizontal size={17} aria-hidden="true" /></IconButton>
    {open && <div className="absolute right-0 top-full z-40 min-w-48 rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-dialog)]" role="menu" aria-label={label} onClick={() => setOpen(false)}>{children}</div>}
  </div>
}

export function InvitationMenuItem({ children, onClick, danger = false, disabled = false, title }: { children: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean; title?: string }) {
  return <button type="button" role="menuitem" disabled={disabled} title={title} className={`flex min-h-9 w-full items-center rounded-md px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-45 ${danger ? 'text-danger hover:bg-danger-muted' : 'hover:bg-surface-muted'}`} onClick={onClick}>{children}</button>
}
