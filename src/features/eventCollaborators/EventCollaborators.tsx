import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../components/ui/Dialog'
import { Heading } from '../../components/ui/Heading'
import { Input } from '../../components/ui/Input'
import { Text } from '../../components/ui/Text'
import { ApiError } from '../../lib/api'
import { addCollaborator, getCollaborators, removeCollaborator, type Collaborator } from './api'

export function EventCollaborators({ eventId }: { eventId: string }) {
  const id = useId()
  const [members, setMembers] = useState<Collaborator[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [removing, setRemoving] = useState<Collaborator | null>(null)
  const [retry, setRetry] = useState(0)
  const active = useRef(false)
  const pending = useRef(false)

  useEffect(() => {
    active.current = true
    const controller = new AbortController()
    getCollaborators(eventId, controller.signal).then((data) => {
      if (controller.signal.aborted) return
      setMembers(data); setReady(true); setError(null); setLoading(false)
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Unable to load collaborators.')
      setDenied(cause instanceof ApiError && cause.status === 403)
      setLoading(false)
    })
    return () => { active.current = false; controller.abort() }
  }, [eventId, retry])

  async function mutate(operation: () => Promise<void>) {
    if (pending.current) return
    pending.current = true; setBusy(true); setError(null); setSuccess(null)
    try { await operation() }
    catch (cause) {
      if (active.current) {
        setError(cause instanceof ApiError ? (cause.validationErrors.email?.[0] ?? cause.message) : cause instanceof Error ? cause.message : 'Unable to update collaborators.')
        if (cause instanceof ApiError && cause.status === 403) { setDenied(true); setMembers([]); setRemoving(null) }
      }
    } finally { pending.current = false; if (active.current) setBusy(false) }
  }

  return <section className="max-w-2xl rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-labelledby={`${id}-heading`}>
    <Heading id={`${id}-heading`} level={2} variant="panel">Collaborators</Heading>
    <Text className="mt-1" variant="muted">Add a registered Kirita user to manage this Event. Only the Owner can manage collaborators.</Text>
    {loading && <Text className="mt-4" role="status">Loading collaborators...</Text>}
    {error && <Text className="mt-4" variant="error" role="alert">{error}</Text>}
    {success && <Text className="mt-4" role="status">{success}</Text>}
    {!loading && !denied && !ready && <Button className="mt-3" type="button" size="sm" onClick={() => { setLoading(true); setRetry((value) => value + 1) }}>Retry</Button>}
    {!loading && !denied && ready && <>
      <ul className="mt-5 space-y-3" aria-label="Event members">{members.map((member) => <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted p-3">
        <div className="min-w-0 flex-1"><p className="break-words font-medium">{member.name}</p><p className="break-all text-sm text-foreground-muted">{member.email}</p><p className="text-xs text-foreground-muted">{member.role === 'owner' ? 'Owner' : 'Manager'}</p></div>
        {member.role !== 'owner' && <Button type="button" size="sm" variant="secondary" disabled={busy} aria-label={`Remove ${member.name}`} onClick={() => { setError(null); setRemoving(member) }}>Remove</Button>}
      </li>)}</ul>
      <form className="mt-6" onSubmit={(event) => { event.preventDefault(); void mutate(async () => {
        const member = await addCollaborator(eventId, email)
        if (!active.current) return
        setMembers((current) => [...current, member]); setEmail(''); setSuccess('Manager added.')
      }) }}>
        <label htmlFor={`${id}-email`} className="mb-1.5 block text-sm font-medium">Registered email address</label>
        <div className="flex flex-col gap-3 sm:flex-row"><Input id={`${id}-email`} type="email" required maxLength={255} autoComplete="email" value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} /><Button className="shrink-0" type="submit" size="sm" disabled={busy || !email.trim()}>{busy ? 'Updating...' : 'Add Manager'}</Button></div>
      </form>
    </>}
    <Dialog open={removing !== null} onClose={() => setRemoving(null)} closeDisabled={busy} titleId={`${id}-remove-title`} descriptionId={`${id}-remove-description`} size="sm">
      <DialogHeader title="Remove Manager?" titleId={`${id}-remove-title`} descriptionId={`${id}-remove-description`} description={`${removing?.name ?? 'This Manager'} will lose access to this Event. Their account and other Events will remain available.`} />
      <DialogFooter className="mt-5"><Button type="button" variant="secondary" disabled={busy} onClick={() => setRemoving(null)}>Cancel</Button><Button type="button" variant="danger" disabled={busy} onClick={() => { if (!removing) return; const member = removing; void mutate(async () => {
        await removeCollaborator(eventId, member.id)
        if (!active.current) return
        setMembers((current) => current.filter((item) => item.id !== member.id)); setRemoving(null); setSuccess('Manager removed.')
      }) }}>{busy ? 'Removing...' : 'Remove Manager'}</Button></DialogFooter>
      {error && <Text className="mt-3" variant="error" role="alert">{error}</Text>}
    </Dialog>
  </section>
}
