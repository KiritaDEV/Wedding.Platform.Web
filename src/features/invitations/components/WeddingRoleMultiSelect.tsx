import { Check, ChevronDown, Plus, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Input } from '../../../components/ui/Input'
import { normalizeInvitationIdentity } from '../invitationForm'
import type { DraftWeddingRole, WeddingRole } from '../types'

type Props = {
  catalog: WeddingRole[]
  draftRoles: DraftWeddingRole[]
  selectedRoleIds: string[]
  selectedDraftKeys: string[]
  disabled?: boolean
  onChange: (roleIds: string[], draftKeys: string[]) => void
  onCreateDraftRole: (name: string) => DraftWeddingRole
}

export function WeddingRoleMultiSelect({ catalog, draftRoles, selectedRoleIds, selectedDraftKeys, disabled, onChange, onCreateDraftRole }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const normalizedSearch = normalizeInvitationIdentity(search)
  const options = useMemo(() => [
    ...catalog.map((role) => ({ identity: `role:${role.id}`, name: role.name, custom: !role.isBuiltin, selected: selectedRoleIds.includes(role.id), role })),
    ...draftRoles.map((role) => ({ identity: `draft:${role.clientKey}`, name: role.name, custom: true, selected: selectedDraftKeys.includes(role.clientKey), draft: role })),
  ].filter((option) => normalizeInvitationIdentity(option.name).includes(normalizedSearch)), [catalog, draftRoles, normalizedSearch, selectedDraftKeys, selectedRoleIds])
  const exact = [...catalog, ...draftRoles].find((role) => normalizeInvitationIdentity(role.name) === normalizedSearch)
  const selected = [
    ...catalog.filter((role) => selectedRoleIds.includes(role.id)).map((role) => ({ ...role, selection: role.id, draft: false })),
    ...draftRoles.filter((role) => selectedDraftKeys.includes(role.clientKey)).map((role) => ({ ...role, selection: role.clientKey, draft: true, isBuiltin: false })),
  ]

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function toggle(option: (typeof options)[number]) {
    if ('role' in option && option.role) {
      onChange(option.selected ? selectedRoleIds.filter((id) => id !== option.role.id) : [...selectedRoleIds, option.role.id], selectedDraftKeys)
    } else if ('draft' in option && option.draft) {
      onChange(selectedRoleIds, option.selected ? selectedDraftKeys.filter((key) => key !== option.draft.clientKey) : [...selectedDraftKeys, option.draft.clientKey])
    }
  }

  function createOrSelect() {
    if (!normalizedSearch) return
    if (exact) {
      const catalogRole = catalog.find((role) => normalizeInvitationIdentity(role.name) === normalizedSearch)
      if (catalogRole && !selectedRoleIds.includes(catalogRole.id)) onChange([...selectedRoleIds, catalogRole.id], selectedDraftKeys)
      const draftRole = draftRoles.find((role) => normalizeInvitationIdentity(role.name) === normalizedSearch)
      if (draftRole && !selectedDraftKeys.includes(draftRole.clientKey)) onChange(selectedRoleIds, [...selectedDraftKeys, draftRole.clientKey])
    } else {
      const role = onCreateDraftRole(search.trim().replace(/\s+/gu, ' '))
      onChange(selectedRoleIds, [...selectedDraftKeys, role.clientKey])
    }
    setSearch('')
  }

  return <div className="relative" ref={rootRef}>
    <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Selected Wedding Roles">
      {selected.map((role) => <span key={`${role.draft}:${role.selection}`} className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs">
        {role.name}{!role.isBuiltin && <span className="text-foreground-muted">Custom</span>}
        <button type="button" aria-label={`Remove ${role.name}`} disabled={disabled} onClick={() => role.draft ? onChange(selectedRoleIds, selectedDraftKeys.filter((key) => key !== role.selection)) : onChange(selectedRoleIds.filter((id) => id !== role.selection), selectedDraftKeys)}><X size={13} aria-hidden="true" /></button>
      </span>)}
    </div>
    <button type="button" disabled={disabled} aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" className="flex min-h-10 w-full items-center rounded-sm border border-border bg-background px-3 py-2 text-left text-sm" onClick={() => setOpen((value) => !value)}>
      <span className="flex-1 text-foreground-muted">Select Wedding Roles</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div id={listId} className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface p-2 shadow-[var(--shadow-dialog)]" role="listbox" aria-multiselectable="true">
      <Input autoFocus value={search} placeholder="Search roles…" aria-label="Search Wedding Roles" onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); createOrSelect() } }} />
      <div className="mt-2 max-h-56 overflow-y-auto">
        {options.map((option) => <button key={option.identity} type="button" role="option" aria-selected={option.selected} className="flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-surface-muted" onClick={() => toggle(option)}>
          <span className="flex-1">{option.name} {option.custom && <span className="ml-1 text-xs text-foreground-muted">Custom</span>}</span>{option.selected && <Check size={15} aria-hidden="true" />}
        </button>)}
        {normalizedSearch && !exact && <button type="button" className="flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-sm font-medium hover:bg-surface-muted" onClick={createOrSelect}><Plus size={15} aria-hidden="true" />Create &quot;{search.trim()}&quot;</button>}
        {!options.length && (!normalizedSearch || exact) && <p className="p-2 text-sm text-foreground-muted">No roles found.</p>}
      </div>
    </div>}
  </div>
}
