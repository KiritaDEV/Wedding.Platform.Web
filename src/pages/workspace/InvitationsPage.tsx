import { Mail, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { WorkspaceSection } from '../../features/events/workspace/WorkspaceSection'
import { useEventWorkspace } from '../../features/events/workspace/EventWorkspaceContext'
import { activateInvitation, deactivateInvitation, deleteInvitation, getWeddingRoles, listInvitations } from '../../features/invitations/api'
import { InvitationConfirmDialog } from '../../features/invitations/components/InvitationConfirmDialog'
import { InvitationFormDialog } from '../../features/invitations/components/InvitationFormDialog'
import { InvitationsResults } from '../../features/invitations/components/InvitationsResults'
import { InvitationsToolbar } from '../../features/invitations/components/InvitationsToolbar'
import { MoveGuestDialog } from '../../features/invitations/components/MoveGuestDialog'
import type { InvitationListGuest, InvitationListItem, InvitationListQuery, InvitationListResult, WeddingRole } from '../../features/invitations/types'
import { ApiError } from '../../lib/api'

const initialQuery: InvitationListQuery = { q: '', lifecycle: 'all', relationship: '', side: '', weddingRoleId: '', rsvp: '', sort: 'recently_added', page: 1 }

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
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; invitation: InvitationListItem } | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [move, setMove] = useState<{ invitation: InvitationListItem; guest: InvitationListGuest } | null>(null)
  const changeQuery = useCallback((patch: Partial<InvitationListQuery>) => setQuery((current) => ({ ...current, ...patch })), [])
  const refetch = useCallback(() => setRefresh((value) => value + 1), [])

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
  async function confirmMutation() {
    if (!confirm) return
    setConfirmPending(true); setConfirmError(null)
    try {
      if (confirm.kind === 'deactivate') await deactivateInvitation(event.id, confirm.invitation.id)
      else await deleteInvitation(event.id, confirm.invitation.id)
      const previousPage = confirm.kind === 'delete' && result?.data.length === 1 && query.page > 1
      setConfirm(null)
      if (previousPage) changeQuery({ page: query.page - 1 }); else refetch()
    } catch (reason) { setConfirmError(reason instanceof Error ? reason.message : 'Unable to complete this action.') }
    finally { setConfirmPending(false) }
  }

  const hasInvitations = (result?.meta.lifecycleCounts.all ?? 0) > 0
  const filtering = query.q !== '' || query.lifecycle !== 'all' || !!query.relationship || !!query.side || !!query.weddingRoleId || !!query.rsvp
  return <WorkspaceSection eyebrow="Event workspace" title="Invitations" description="Manage Invitations and their Guests." wide>
    <div className="flex justify-end"><Button onClick={() => setDialog({ mode: 'create' })}><Plus aria-hidden="true" size={16} />New invitation</Button></div>
    {result && <section className="mt-4 flex flex-wrap gap-x-2 gap-y-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm" aria-label="Invitation operational summary"><strong>{result.meta.summary.activeInvitations} active invitations</strong><span aria-hidden="true">·</span><span>{result.meta.summary.guests} guests</span><span aria-hidden="true">·</span><span>{result.meta.summary.attending} attending</span><span aria-hidden="true">·</span><span>{result.meta.summary.declined} declined</span><span aria-hidden="true">·</span><span>{result.meta.summary.pending} pending</span></section>}
    <section className="mt-4" aria-label="Invitation coordinator controls">{result && <InvitationsToolbar query={query} counts={result.meta.lifecycleCounts} roles={roles} loading={loading} onChange={changeQuery} />}</section>
    {error && <div className="mt-4 rounded-xl bg-danger-muted p-4 text-sm text-danger" role="alert">{error} <Button className="ml-2" size="sm" variant="secondary" onClick={refetch}>Try again</Button></div>}
    {!result && loading && <div className="mt-6 grid min-h-64 place-items-center rounded-xl border border-border bg-surface text-sm text-foreground-muted" role="status">Loading Invitations…</div>}
    {result && <div className="mt-4">{filtering && <p className="mb-2 text-sm text-foreground-muted">{result.meta.pagination.total} {result.meta.pagination.total === 1 ? 'invitation' : 'invitations'} found</p>}
      {!hasInvitations ? <Empty title="No invitations yet" message="Create the first Invitation and add its named Guests."><Button onClick={() => setDialog({ mode: 'create' })}>New invitation</Button></Empty>
        : result.data.length === 0 ? <Empty title="No invitations found" message="Try clearing Search or changing the active filters."><Button variant="secondary" onClick={() => setQuery(initialQuery)}>Clear search and filters</Button></Empty>
          : <InvitationsResults invitations={result.data} expanded={expanded} sort={query.sort} onToggle={toggle} onSort={(sort) => changeQuery({ sort, page: 1 })} onEdit={(invitationId) => setDialog({ mode: 'edit', invitationId })} onActivate={activate} onDeactivate={(invitation) => { setConfirmError(null); setConfirm({ kind: 'deactivate', invitation }) }} onDelete={(invitation) => { setConfirmError(null); setConfirm({ kind: 'delete', invitation }) }} onMove={(invitation, guest) => setMove({ invitation, guest })} />}
      {result.meta.pagination.lastPage > 1 && <nav className="mt-5 flex items-center justify-center gap-3" aria-label="Invitation pages"><Button variant="secondary" disabled={query.page <= 1 || loading} onClick={() => changeQuery({ page: query.page - 1 })}>Previous</Button><span className="text-sm text-foreground-muted">Page {result.meta.pagination.currentPage} of {result.meta.pagination.lastPage}</span><Button variant="secondary" disabled={query.page >= result.meta.pagination.lastPage || loading} onClick={() => changeQuery({ page: query.page + 1 })}>Next</Button></nav>}
    </div>}
    <InvitationFormDialog open={dialog !== null} eventId={event.id} mode={dialog?.mode ?? 'create'} invitationId={dialog?.invitationId} onClose={() => setDialog(null)} onSaved={refetch} />
    <InvitationConfirmDialog open={confirm !== null} kind={confirm?.kind ?? 'deactivate'} invitationName={confirm?.invitation.effectiveName ?? ''} pending={confirmPending} error={confirmError} onClose={() => { if (!confirmPending) setConfirm(null) }} onConfirm={confirmMutation} />
    <MoveGuestDialog open={move !== null} eventId={event.id} sourceInvitationId={move?.invitation.id ?? ''} guest={move?.guest ?? null} onClose={() => setMove(null)} onMoved={() => { setMove(null); refetch() }} />
  </WorkspaceSection>
}

function Empty({ title, message, children }: { title: string; message: string; children: React.ReactNode }) { return <section className="rounded-xl border border-border bg-surface p-8 text-center"><Mail className="mx-auto text-secondary-accent" aria-hidden="true" /><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-1 text-sm text-foreground-muted">{message}</p><div className="mt-4">{children}</div></section> }
