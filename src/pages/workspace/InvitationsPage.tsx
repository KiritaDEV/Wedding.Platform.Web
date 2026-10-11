import { Mail, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { WorkspaceSection } from '../../features/events/workspace/WorkspaceSection'
import { useEventWorkspace } from '../../features/events/workspace/EventWorkspaceContext'
import { activateInvitation, deactivateInvitation, deleteInvitation, getInvitationPrivatePath, getWeddingRoles, listInvitations, resetInvitationTrustedAccess, rotateInvitationPrivateLink } from '../../features/invitations/api'
import { InvitationConfirmDialog } from '../../features/invitations/components/InvitationConfirmDialog'
import { AccessActivityDialog } from '../../features/invitations/components/AccessActivityDialog'
import { InvitationFormDialog } from '../../features/invitations/components/InvitationFormDialog'
import { InvitationLinkRotatedDialog } from '../../features/invitations/components/InvitationLinkRotatedDialog'
import { InvitationsResults } from '../../features/invitations/components/InvitationsResults'
import { InvitationsToolbar } from '../../features/invitations/components/InvitationsToolbar'
import { MoveGuestDialog } from '../../features/invitations/components/MoveGuestDialog'
import { ManageRsvpDialog } from '../../features/invitations/components/ManageRsvpDialog'
import type { InvitationListGuest, InvitationListItem, InvitationListQuery, InvitationListResult, WeddingRole } from '../../features/invitations/types'
import { canonicalPrivateUrl, copyText } from '../../features/privateEventSite/clipboard'
import { ApiError } from '../../lib/api'
import { INVITATIONS_REFRESH_EVENT, NEW_NOTIFICATION_EVENT } from '../../features/notifications/NotificationCenter'

const initialQuery: InvitationListQuery = { q: '', lifecycle: 'all', relationships: [], sides: [], roleIds: [], rsvpStatuses: [], guestResponses: [], sort: 'recently_added', page: 1 }

export function InvitationsPage() {
  const event = useEventWorkspace()
  const [query, setQuery] = useState(initialQuery)
  const [result, setResult] = useState<InvitationListResult | null>(null)
  const [roles, setRoles] = useState<WeddingRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; invitationId?: string } | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete' | 'reset-access' | 'rotate-link'; invitation: InvitationListItem } | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)
  const confirmPendingRef = useRef(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [linkFeedback, setLinkFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [rotatedUrl, setRotatedUrl] = useState<string | null>(null)
  const [move, setMove] = useState<{ invitation: InvitationListItem; guest: InvitationListGuest } | null>(null)
  const [activity, setActivity] = useState<InvitationListItem | null>(null)
  const [manageRsvp, setManageRsvp] = useState<InvitationListItem | null>(null)
  const lastAutomaticRefresh = useRef(0)
  const changeQuery = useCallback((patch: Partial<InvitationListQuery>) => setQuery((current) => ({ ...current, ...patch })), [])
  const refetch = useCallback(() => setRefresh((value) => value + 1), [])

  useEffect(() => {
    const automaticRefresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastAutomaticRefresh.current < 500) return
      lastAutomaticRefresh.current = Date.now(); refetch()
    }
    document.addEventListener('visibilitychange', automaticRefresh)
    window.addEventListener('focus', automaticRefresh)
    window.addEventListener(NEW_NOTIFICATION_EVENT, automaticRefresh)
    window.addEventListener(INVITATIONS_REFRESH_EVENT, automaticRefresh)
    return () => { document.removeEventListener('visibilitychange', automaticRefresh); window.removeEventListener('focus', automaticRefresh); window.removeEventListener(NEW_NOTIFICATION_EVENT, automaticRefresh); window.removeEventListener(INVITATIONS_REFRESH_EVENT, automaticRefresh) }
  }, [refetch])

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => { setLoading(true); setError(null); listInvitations(event.id, query, controller.signal).then((next) => { const validPage = Math.max(1, next.meta.pagination.lastPage); if (query.page > validPage) changeQuery({ page: validPage }); else setResult(next) }).catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) { if (import.meta.env.DEV) console.error('Invitation coordinator response failed to load.', reason); setError(reason instanceof ApiError ? reason.message : 'Unable to load Invitations.') } }).finally(() => { if (!controller.signal.aborted) setLoading(false) }) })
    return () => controller.abort()
  }, [changeQuery, event.id, query, refresh])

  useEffect(() => {
    const controller = new AbortController()
    getWeddingRoles(event.id, controller.signal).then(setRoles).catch(() => undefined)
    return () => controller.abort()
  }, [event.id, refresh])

  function toggle(id: string) { setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  async function activate(invitation: InvitationListItem) { try { await activateInvitation(event.id, invitation.id); refetch() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to activate this Invitation.') } }
  async function copyInvitationLink(invitation: InvitationListItem) {
    setLinkFeedback(null)
    try {
      const path = await getInvitationPrivatePath(event.id, invitation.id)
      const copied = await copyText(canonicalPrivateUrl(window.location.origin, path))
      setLinkFeedback(copied ? { kind: 'success', message: 'Invitation link copied.' } : { kind: 'error', message: 'Unable to copy the invitation link.' })
    } catch {
      setLinkFeedback({ kind: 'error', message: 'Unable to load the invitation link.' })
    }
  }
  async function confirmMutation() {
    if (!confirm || confirmPendingRef.current) return
    confirmPendingRef.current = true
    setConfirmPending(true); setConfirmError(null)
    try {
      if (confirm.kind === 'deactivate') await deactivateInvitation(event.id, confirm.invitation.id)
      else if (confirm.kind === 'delete') await deleteInvitation(event.id, confirm.invitation.id)
      else if (confirm.kind === 'reset-access') {
        await resetInvitationTrustedAccess(event.id, confirm.invitation.id)
        setResult((current) => current === null ? null : { ...current, data: current.data.map((invitation) => invitation.id === confirm.invitation.id ? { ...invitation, trustedAccess: { hasTrustedBrowser: false, hasPendingAccessRequest: false } } : invitation) })
      } else {
        const rotated = await rotateInvitationPrivateLink(event.id, confirm.invitation.id)
        setResult((current) => current === null ? null : { ...current, data: current.data.map((invitation) => invitation.id === confirm.invitation.id ? { ...invitation, trustedAccess: rotated.trustedAccess } : invitation) })
        setRotatedUrl(canonicalPrivateUrl(window.location.origin, rotated.privateInvitation.path))
      }
      const previousPage = confirm.kind === 'delete' && result?.data.length === 1 && query.page > 1
      setConfirm(null)
      if (previousPage) changeQuery({ page: query.page - 1 }); else if (confirm.kind !== 'reset-access' && confirm.kind !== 'rotate-link') refetch()
    } catch (reason) {
      if (confirm.kind === 'rotate-link') void getInvitationPrivatePath(event.id, confirm.invitation.id).catch(() => undefined)
      setConfirmError(reason instanceof Error ? reason.message : 'Unable to complete this action.')
    }
    finally { confirmPendingRef.current = false; setConfirmPending(false) }
  }

  const hasInvitations = (result?.meta.lifecycleCounts.all ?? 0) > 0
  const filtering = query.q !== '' || query.lifecycle !== 'all' || query.relationships.length > 0 || query.sides.length > 0 || query.roleIds.length > 0 || query.rsvpStatuses.length > 0 || query.guestResponses.length > 0
  return <WorkspaceSection eyebrow="Event workspace" title="Invitations" description="Manage Invitations and their Guests." wide>
    <div className="flex justify-end"><Button onClick={() => setDialog({ mode: 'create' })}><Plus aria-hidden="true" size={16} />New invitation</Button></div>
    {result && <section className="mt-4 flex flex-wrap gap-x-2 gap-y-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm" aria-label="Invitation operational summary"><strong>{result.meta.summary.activeInvitations} active invitations</strong><span aria-hidden="true">·</span><span>{result.meta.summary.guests} guests</span><span aria-hidden="true">·</span><span>{result.meta.summary.attending} attending</span><span aria-hidden="true">·</span><span>{result.meta.summary.declined} declined</span><span aria-hidden="true">·</span><span>{result.meta.summary.pending} pending</span></section>}
    <section className="mt-4" aria-label="Invitation coordinator controls">{result && <InvitationsToolbar query={query} counts={result.meta.lifecycleCounts} roles={roles} loading={loading} onChange={changeQuery} onRefresh={refetch} />}</section>
    {error && <div className="mt-4 rounded-xl bg-danger-muted p-4 text-sm text-danger" role="alert">{error} <Button className="ml-2" size="sm" variant="secondary" onClick={refetch}>Try again</Button></div>}
    {linkFeedback && <p className={`mt-4 rounded-xl p-3 text-sm ${linkFeedback.kind === 'error' ? 'bg-danger-muted text-danger' : 'bg-surface-muted text-foreground'}`} role={linkFeedback.kind === 'error' ? 'alert' : 'status'}>{linkFeedback.message}</p>}
    {!result && loading && <div className="mt-6 grid min-h-64 place-items-center rounded-xl border border-border bg-surface text-sm text-foreground-muted" role="status">Loading Invitations…</div>}
    {result && <div className="mt-4">{filtering && <p className="mb-2 text-sm text-foreground-muted">{result.meta.pagination.total} {result.meta.pagination.total === 1 ? 'invitation' : 'invitations'} found</p>}
      {!hasInvitations ? <Empty title="No invitations yet" message="Create the first Invitation and add its named Guests."><Button onClick={() => setDialog({ mode: 'create' })}>New invitation</Button></Empty>
        : result.data.length === 0 ? <Empty title="No invitations found" message="Try clearing Search or changing the active filters."><Button variant="secondary" onClick={() => setQuery(initialQuery)}>Clear search and filters</Button></Empty>
          : <InvitationsResults invitations={result.data} expanded={expanded} sort={query.sort} onToggle={toggle} onSort={(sort) => changeQuery({ sort, page: 1 })} onEdit={(invitationId) => setDialog({ mode: 'edit', invitationId })} onManageRsvp={setManageRsvp} onAccessActivity={setActivity} onCopyLink={(invitation) => { void copyInvitationLink(invitation) }} onRotateLink={(invitation) => { setConfirmError(null); setConfirm({ kind: 'rotate-link', invitation }) }} onActivate={activate} onDeactivate={(invitation) => { setConfirmError(null); setConfirm({ kind: 'deactivate', invitation }) }} onResetAccess={(invitation) => { setConfirmError(null); setConfirm({ kind: 'reset-access', invitation }) }} onDelete={(invitation) => { setConfirmError(null); setConfirm({ kind: 'delete', invitation }) }} onMove={(invitation, guest) => setMove({ invitation, guest })} />}
      {result.meta.pagination.lastPage > 1 && <nav className="mt-5 flex items-center justify-center gap-3" aria-label="Invitation pages"><Button variant="secondary" disabled={query.page <= 1 || loading} onClick={() => changeQuery({ page: query.page - 1 })}>Previous</Button><span className="text-sm text-foreground-muted">Page {result.meta.pagination.currentPage} of {result.meta.pagination.lastPage}</span><Button variant="secondary" disabled={query.page >= result.meta.pagination.lastPage || loading} onClick={() => changeQuery({ page: query.page + 1 })}>Next</Button></nav>}
    </div>}
    <InvitationFormDialog open={dialog !== null} eventId={event.id} mode={dialog?.mode ?? 'create'} invitationId={dialog?.invitationId} onClose={() => setDialog(null)} onSaved={refetch} />
    <InvitationConfirmDialog open={confirm !== null} kind={confirm?.kind ?? 'deactivate'} invitationName={confirm?.invitation.effectiveName ?? ''} pending={confirmPending} error={confirmError} onClose={() => { if (!confirmPending) setConfirm(null) }} onConfirm={confirmMutation} />
    <InvitationLinkRotatedDialog url={rotatedUrl} onClose={() => setRotatedUrl(null)} />
    <AccessActivityDialog open={activity !== null} eventId={event.id} invitation={activity} onClose={() => setActivity(null)} />
    <ManageRsvpDialog open={manageRsvp !== null} eventId={event.id} invitation={manageRsvp} onClose={() => setManageRsvp(null)} onSaved={refetch} />
    <MoveGuestDialog open={move !== null} eventId={event.id} sourceInvitationId={move?.invitation.id ?? ''} guest={move?.guest ?? null} onClose={() => setMove(null)} onMoved={() => { setMove(null); refetch() }} />
  </WorkspaceSection>
}

function Empty({ title, message, children }: { title: string; message: string; children: React.ReactNode }) { return <section className="rounded-xl border border-border bg-surface p-8 text-center"><Mail className="mx-auto text-secondary-accent" aria-hidden="true" /><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-1 text-sm text-foreground-muted">{message}</p><div className="mt-4">{children}</div></section> }
