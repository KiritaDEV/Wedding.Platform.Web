import { Button } from '../../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../../components/ui/Dialog'

export function InvitationConfirmDialog({ open, kind, invitationName, pending, error, onClose, onConfirm }: {
  open: boolean; kind: 'deactivate' | 'delete'; invitationName: string; pending: boolean; error: string | null; onClose: () => void; onConfirm: () => void
}) {
  const deleting = kind === 'delete'
  return <Dialog open={open} onClose={onClose} closeDisabled={pending} size="sm" titleId="invitation-confirm-title" descriptionId="invitation-confirm-description">
    <div className="p-5"><DialogHeader title={deleting ? 'Delete this invitation?' : 'Deactivate this invitation?'} titleId="invitation-confirm-title" description={deleting ? `${invitationName} and its Guests will be permanently deleted. This cannot be undone.` : `${invitationName} will remain saved and can be reactivated later.`} descriptionId="invitation-confirm-description" onClose={onClose} closeDisabled={pending} />
      {error && <p className="mt-4 rounded-lg bg-danger-muted p-3 text-sm text-danger" role="alert">{error}</p>}
      <DialogFooter className="mt-5"><Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button><Button type="button" variant={deleting ? 'danger' : 'primary'} disabled={pending} onClick={onConfirm}>{pending ? 'Working…' : deleting ? 'Delete invitation' : 'Deactivate'}</Button></DialogFooter>
    </div>
  </Dialog>
}
