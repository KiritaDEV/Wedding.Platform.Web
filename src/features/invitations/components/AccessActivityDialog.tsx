import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../../components/ui/Dialog'
import { ApiError } from '../../../lib/api'
import { accessActivityLabels, auditActorLabel, invalidationReasonLabels } from '../accessActivityPresentation'
import { getInvitationAccessAudit } from '../api'
import type { InvitationAccessAuditEntry, InvitationListItem } from '../types'

export function AccessActivityDialog({ open, eventId, invitation, onClose }: { open: boolean; eventId: string; invitation: InvitationListItem | null; onClose: () => void }) {
  const [entries, setEntries] = useState<InvitationAccessAuditEntry[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!open || !invitation) return
    const controller = new AbortController()
    queueMicrotask(() => {
      setLoading(true); setError(null); setEntries([]); setCursor(null)
      getInvitationAccessAudit(eventId, invitation.id, undefined, controller.signal)
        .then((result) => { setEntries(result.data); setCursor(result.meta.nextCursor) })
        .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof ApiError ? reason.message : 'Unable to load access activity.') })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    })
    return () => controller.abort()
  }, [eventId, invitation, open, reload])

  async function loadMore() {
    if (!invitation || !cursor || loading) return
    setLoading(true); setError(null)
    try { const result = await getInvitationAccessAudit(eventId, invitation.id, cursor); setEntries((current) => [...current, ...result.data]); setCursor(result.meta.nextCursor) }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to load more access activity.') }
    finally { setLoading(false) }
  }

  return <Dialog open={open} onClose={onClose} titleId="access-activity-title" size="lg" contained mobileFullScreen className="max-h-[90dvh]">
    <div className="flex max-h-[90dvh] flex-col max-sm:h-dvh max-sm:max-h-dvh">
      <DialogHeader className="shrink-0 border-b border-border p-5" title="Access activity" titleId="access-activity-title" description={invitation?.effectiveName} onClose={onClose} />
      <div className="min-h-48 flex-1 overflow-y-auto p-5">
        {loading && entries.length === 0 && <p role="status" className="text-sm text-foreground-muted">Loading access activity…</p>}
        {error && entries.length === 0 && <div role="alert" className="rounded-lg bg-danger-muted p-3 text-sm text-danger">{error} <Button size="sm" variant="secondary" onClick={() => setReload((value) => value + 1)}>Try again</Button></div>}
        {!loading && !error && entries.length === 0 && <p className="text-sm text-foreground-muted">No access activity yet.</p>}
        {entries.length > 0 && <ol className="divide-y divide-border">{entries.map((entry) => <li key={entry.id} className="py-4 first:pt-0">
          <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{accessActivityLabels[entry.type]}</strong><time className="text-xs text-foreground-muted" dateTime={entry.occurredAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.occurredAt))}</time></div>
          <p className="mt-1 text-sm text-foreground-muted">{auditActorLabel(entry.actor)}</p>
          {entry.details?.reason && <p className="mt-1 text-sm">Reason: {invalidationReasonLabels[entry.details.reason]}</p>}
          {(entry.details?.requesterBrowserFamily || entry.details?.requesterPlatform) && <p className="mt-1 text-sm text-foreground-muted">Requested by {[entry.details.requesterBrowserFamily, entry.details.requesterPlatform].filter(Boolean).join(' on ')}</p>}
        </li>)}</ol>}
        {error && entries.length > 0 && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </div>
      <DialogFooter className="shrink-0 border-t border-border p-4"><Button variant="secondary" onClick={onClose}>Close</Button>{cursor && <Button disabled={loading} onClick={() => { void loadMore() }}>{loading ? 'Loading…' : 'Load more'}</Button>}</DialogFooter>
    </div>
  </Dialog>
}
