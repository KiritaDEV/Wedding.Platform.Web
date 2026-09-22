import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../../components/ui/Dialog'
import { Select } from '../../../components/ui/Select'
import { ApiError } from '../../../lib/api'
import { getInvitationOptions, moveGuest } from '../api'
import { guestFullName } from '../invitationForm'
import type { InvitationListGuest, InvitationOption } from '../types'

export function MoveGuestDialog({ open, eventId, sourceInvitationId, guest, onClose, onMoved }: {
  open: boolean; eventId: string; sourceInvitationId: string; guest: InvitationListGuest | null; onClose: () => void; onMoved: () => void
}) {
  const [options, setOptions] = useState<InvitationOption[]>([])
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    queueMicrotask(() => { setLoading(true); setError(null); setDestination(''); getInvitationOptions(eventId, controller.signal).then((all) => setOptions(all.filter((option) => option.id !== sourceInvitationId))).catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Unable to load destinations.') }).finally(() => setLoading(false)) })
    return () => controller.abort()
  }, [eventId, open, sourceInvitationId])
  async function submit() {
    if (!guest || !destination) return
    setPending(true); setError(null)
    try { await moveGuest(eventId, sourceInvitationId, guest.id, destination); onMoved() }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to move this Guest.') }
    finally { setPending(false) }
  }
  const name = guest ? guestFullName(guest) : 'Guest'
  return <Dialog open={open} onClose={onClose} closeDisabled={pending} size="sm" titleId="move-guest-title" descriptionId="move-guest-description">
    <div className="p-5"><DialogHeader title="Move to another invitation" titleId="move-guest-title" description={`Choose a destination for ${name}.`} descriptionId="move-guest-description" onClose={onClose} closeDisabled={pending} />
      <div className="mt-5"><label className="mb-1 block text-sm font-medium" htmlFor="move-destination">Destination invitation</label><Select id="move-destination" value={destination} disabled={loading || pending} options={[{ value: '', label: loading ? 'Loading invitations…' : 'Select an invitation' }, ...options.map((option) => ({ value: option.id, label: `${option.effectiveName} (${option.guestCount})${option.status === 'inactive' ? ' · Inactive' : ''}` }))]} onChange={setDestination} /></div>
      {error && <p className="mt-3 rounded-lg bg-danger-muted p-3 text-sm text-danger" role="alert">{error}</p>}
      <DialogFooter className="mt-5"><Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button><Button type="button" disabled={!destination || pending} onClick={submit}>{pending ? 'Moving…' : 'Move Guest'}</Button></DialogFooter>
    </div>
  </Dialog>
}
