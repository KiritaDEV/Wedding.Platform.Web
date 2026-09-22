import { ChevronDown, ChevronRight } from 'lucide-react'
import { guestFullName } from '../invitationForm'
import type { GuestRelationship, GuestSide, InvitationListGuest, InvitationListItem, InvitationSort } from '../types'
import { InvitationActionMenu, InvitationMenuItem } from './InvitationMenus'

const relationshipLabels: Record<GuestRelationship, string> = { guest_other: 'Guest / Other', parent: 'Parent', family_member: 'Family member', friend: 'Friend', colleague: 'Colleague' }
const sideLabels: Record<GuestSide, string> = { unspecified: 'Unspecified', bride: 'Bride', groom: 'Groom', both: 'Both' }

type Props = {
  invitations: InvitationListItem[]; expanded: Set<string>; sort: InvitationSort
  onToggle: (id: string) => void; onSort: (sort: InvitationSort) => void; onEdit: (id: string) => void
  onActivate: (invitation: InvitationListItem) => void; onDeactivate: (invitation: InvitationListItem) => void; onDelete: (invitation: InvitationListItem) => void
  onMove: (invitation: InvitationListItem, guest: InvitationListGuest) => void
}

export function InvitationRsvpSummary({ invitation }: { invitation: InvitationListItem }) {
  const label = invitation.rsvp.status[0].toUpperCase() + invitation.rsvp.status.slice(1)
  const counts = [
    { count: invitation.rsvp.attending, status: 'attending', marker: '🟢' },
    { count: invitation.rsvp.declined, status: 'declined', marker: '🔴' },
    { count: invitation.rsvp.pending, status: 'pending', marker: '🟡' },
  ].filter((item) => item.count > 0)
  return <span className="inline-flex flex-wrap items-center gap-2 text-sm"><strong>{label}</strong><span className="inline-flex flex-wrap items-center gap-2">{counts.map((item) => <span key={item.status} aria-label={`${item.count} ${item.status}`}><span aria-hidden="true">{item.count}{item.marker}</span></span>)}</span></span>
}

function ExpandButton({ invitation, expanded, targetId, onToggle }: { invitation: InvitationListItem; expanded: boolean; targetId: string; onToggle: () => void }) {
  const Icon = expanded ? ChevronDown : ChevronRight
  return <button type="button" className="inline-grid size-8 shrink-0 place-items-center rounded hover:bg-surface-muted" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${invitation.effectiveName}`} aria-expanded={expanded} aria-controls={targetId} onClick={(event) => { event.stopPropagation(); onToggle() }}><Icon size={17} aria-hidden="true" /></button>
}

function Actions({ invitation, onEdit, onActivate, onDeactivate, onDelete }: Pick<Props, 'onEdit' | 'onActivate' | 'onDeactivate' | 'onDelete'> & { invitation: InvitationListItem }) {
  return <InvitationActionMenu label={`Actions for ${invitation.effectiveName}`}><InvitationMenuItem onClick={() => onEdit(invitation.id)}>Edit</InvitationMenuItem>{invitation.status === 'active' ? <InvitationMenuItem onClick={() => onDeactivate(invitation)}>Deactivate</InvitationMenuItem> : <InvitationMenuItem onClick={() => onActivate(invitation)}>Activate</InvitationMenuItem>}<div className="my-1 border-t border-border" /><InvitationMenuItem danger onClick={() => onDelete(invitation)}>Delete</InvitationMenuItem></InvitationActionMenu>
}

function GuestRows({ invitation, targetId, onMove }: { invitation: InvitationListItem; targetId: string; onMove: Props['onMove'] }) {
  return <div id={targetId} className="border-t border-border bg-surface-muted/50 p-3 sm:p-4">
    <div className="md:hidden" data-mobile-guest-list>
      {invitation.guests.map((guest) => <MobileGuestRow key={guest.id} invitation={invitation} guest={guest} onMove={onMove} />)}
    </div>
    <div className="hidden md:block" data-desktop-guest-table>
      <div className="grid grid-cols-[1.3fr_1fr_0.8fr_1.5fr_0.7fr_3rem] gap-3 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted"><span>Guest</span><span>Relationship</span><span>Side</span><span>Wedding roles</span><span>RSVP</span><span>Actions</span></div>
      {invitation.guests.map((guest) => <div key={guest.id} className="grid grid-cols-[1.3fr_1fr_0.8fr_1.5fr_0.7fr_3rem] items-center gap-3 border-t border-border px-3 py-3 first:border-t-0">
        <strong className="text-sm">{guestFullName(guest)}</strong><span className="text-sm text-foreground-muted">{relationshipLabels[guest.relationship]}</span><span className="text-sm text-foreground-muted">{sideLabels[guest.side]}</span>
        <div className="flex flex-wrap gap-1">{guest.weddingRoles.length ? guest.weddingRoles.map((role) => <span key={role.id} className="rounded-full bg-surface px-2 py-0.5 text-xs">{role.name}</span>) : <span className="text-sm text-foreground-muted">—</span>}</div>
        <span className="text-sm">{guest.rsvpStatus[0].toUpperCase() + guest.rsvpStatus.slice(1)}</span>
        <div className="justify-self-end"><InvitationActionMenu label={`Actions for ${guestFullName(guest)}`}><InvitationMenuItem disabled={invitation.guestCount === 1} title={invitation.guestCount === 1 ? 'An invitation must keep at least one guest.' : undefined} onClick={() => onMove(invitation, guest)}>Move to another invitation</InvitationMenuItem></InvitationActionMenu></div>
      </div>)}
    </div>
  </div>
}

function MobileGuestRow({ invitation, guest, onMove }: { invitation: InvitationListItem; guest: InvitationListGuest; onMove: Props['onMove'] }) {
  const name = guestFullName(guest)
  const rsvp = guest.rsvpStatus[0].toUpperCase() + guest.rsvpStatus.slice(1)
  return <div className="border-t border-border px-1 py-3 first:border-t-0" data-mobile-guest-row>
    <div className="flex min-w-0 items-center gap-2">
      <strong className="min-w-0 flex-1 truncate text-sm">{name}</strong>
      <span className="shrink-0 text-sm">{rsvp}</span>
      <div className="shrink-0" onClick={(event) => event.stopPropagation()}><InvitationActionMenu label={`Guest actions for ${name}`}><InvitationMenuItem disabled={invitation.guestCount === 1} title={invitation.guestCount === 1 ? 'An invitation must keep at least one guest.' : undefined} onClick={() => onMove(invitation, guest)}>Move to another invitation</InvitationMenuItem></InvitationActionMenu></div>
    </div>
    <p className="mt-1 text-sm text-foreground-muted">{relationshipLabels[guest.relationship]} <span aria-hidden="true">·</span><span className="sr-only">, </span> {sideLabels[guest.side]}</p>
    {guest.weddingRoles.length > 0 && <div className="mt-2 flex flex-wrap gap-1" data-mobile-guest-roles>{guest.weddingRoles.map((role) => <span key={role.id} className="rounded-full bg-surface px-2 py-0.5 text-xs">{role.name}</span>)}</div>}
  </div>
}

export function InvitationsResults(props: Props) {
  const invitationAriaSort = props.sort === 'invitation_asc' ? 'ascending' : props.sort === 'invitation_desc' ? 'descending' : 'none'
  const responseAriaSort = props.sort === 'last_response_asc' ? 'ascending' : props.sort === 'last_response_desc' ? 'descending' : 'none'
  const invitationSort = props.sort === 'invitation_asc' ? 'invitation_desc' : 'invitation_asc'
  const responseSort = props.sort === 'last_response_desc' ? 'last_response_asc' : 'last_response_desc'
  return <>
    <div className="hidden overflow-visible rounded-xl border border-border bg-surface md:block"><table className="w-full table-fixed border-collapse text-left"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-foreground-muted"><th className="w-[42%] px-4 py-3" aria-sort={invitationAriaSort}><button type="button" onClick={() => props.onSort(invitationSort)}>Invitation {invitationAriaSort === 'ascending' ? '↑' : invitationAriaSort === 'descending' ? '↓' : ''}</button></th><th className="w-[30%] px-4 py-3">RSVP</th><th className="w-[18%] px-4 py-3" aria-sort={responseAriaSort}><button type="button" onClick={() => props.onSort(responseSort)}>Last response {responseAriaSort === 'ascending' ? '↑' : responseAriaSort === 'descending' ? '↓' : ''}</button></th><th className="w-[10%] px-4 py-3 text-right">Actions</th></tr></thead>
      <tbody>{props.invitations.map((invitation) => { const open = props.expanded.has(invitation.id); return <InvitationDesktopRows key={invitation.id} invitation={invitation} open={open} {...props} /> })}</tbody></table></div>
    <div className="space-y-3 md:hidden">{props.invitations.map((invitation) => { const open = props.expanded.has(invitation.id); const targetId = `invitation-guests-mobile-${invitation.id}`; return <article key={invitation.id} className={`rounded-xl border border-border bg-surface ${invitation.status === 'inactive' ? 'opacity-75' : ''}`}><div className="flex cursor-pointer items-start gap-2 p-4" onClick={() => props.onToggle(invitation.id)}><ExpandButton invitation={invitation} expanded={open} targetId={targetId} onToggle={() => props.onToggle(invitation.id)} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{invitation.effectiveName} ({invitation.guestCount})</strong>{invitation.status === 'inactive' && <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">Inactive</span>}</div><div className="mt-1"><InvitationRsvpSummary invitation={invitation} /></div><p className="mt-1 text-sm text-foreground-muted">Last response: {formatResponse(invitation.lastResponse)}</p></div><Actions invitation={invitation} {...props} /></div>{open && <GuestRows invitation={invitation} targetId={targetId} onMove={props.onMove} />}</article> })}</div>
  </>
}

function InvitationDesktopRows({ invitation, open, ...props }: Props & { invitation: InvitationListItem; open: boolean }) {
  const targetId = `invitation-guests-desktop-${invitation.id}`
  return <><tr className={`cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-muted/50 ${invitation.status === 'inactive' ? 'text-foreground-muted' : ''}`} onClick={() => props.onToggle(invitation.id)}><td className="px-4 py-3"><div className="flex items-center gap-2"><ExpandButton invitation={invitation} expanded={open} targetId={targetId} onToggle={() => props.onToggle(invitation.id)} /><strong className="text-sm text-foreground">{invitation.effectiveName} ({invitation.guestCount})</strong>{invitation.status === 'inactive' && <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">Inactive</span>}</div></td><td className="px-4 py-3"><InvitationRsvpSummary invitation={invitation} /></td><td className="px-4 py-3 text-sm">{formatResponse(invitation.lastResponse)}</td><td className="px-4 py-3"><div className="flex justify-end"><Actions invitation={invitation} {...props} /></div></td></tr>{open && <tr><td colSpan={4}><GuestRows invitation={invitation} targetId={targetId} onMove={props.onMove} /></td></tr>}</>
}

function formatResponse(value: string | null): string { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }
