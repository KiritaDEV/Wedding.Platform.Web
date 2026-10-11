import { Button } from '../../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../../components/ui/Dialog'

export function InvitationConfirmDialog({ open, kind, invitationName, pending, error, onClose, onConfirm }: {
  open: boolean; kind: 'deactivate' | 'delete' | 'reset-access' | 'rotate-link'; invitationName: string; pending: boolean; error: string | null; onClose: () => void; onConfirm: () => void
}) {
  const deleting = kind === 'delete'
  const resettingAccess = kind === 'reset-access'
  const rotatingLink = kind === 'rotate-link'
  const title = rotatingLink ? 'Rotate private invitation link?' : resettingAccess ? 'Reset trusted access?' : deleting ? 'Delete this invitation?' : 'Deactivate this invitation?'
  const description = rotatingLink
    ? 'The current invitation link will stop working for browsers that are not already trusted. The currently trusted browser will remain trusted. Any pending access request will be cancelled. RSVP responses will not change.'
    : resettingAccess
    ? 'This will revoke access from the currently trusted browser and cancel any pending access request. RSVP responses and the private invitation link will not change.'
    : deleting ? `${invitationName} and its Guests will be permanently deleted. This cannot be undone.` : `${invitationName} will remain saved and can be reactivated later.`
  const action = rotatingLink ? 'Rotate link' : resettingAccess ? 'Reset access' : deleting ? 'Delete invitation' : 'Deactivate'

  return <Dialog open={open} onClose={onClose} closeDisabled={pending} size="sm" titleId="invitation-confirm-title" descriptionId="invitation-confirm-description">
    <div className="p-5"><DialogHeader title={title} titleId="invitation-confirm-title" description={description} descriptionId="invitation-confirm-description" onClose={onClose} closeDisabled={pending} />
      {error && <p className="mt-4 rounded-lg bg-danger-muted p-3 text-sm text-danger" role="alert">{error}</p>}
      <DialogFooter className="mt-5"><Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button><Button type="button" variant={deleting || resettingAccess || rotatingLink ? 'danger' : 'primary'} disabled={pending} onClick={onConfirm}>{pending ? 'Working…' : action}</Button></DialogFooter>
    </div>
  </Dialog>
}
