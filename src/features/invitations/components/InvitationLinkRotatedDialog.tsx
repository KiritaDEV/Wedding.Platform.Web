import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../../components/ui/Dialog'
import { copyText } from '../../privateEventSite/clipboard'

export function InvitationLinkRotatedDialog({ url, onClose }: { url: string | null; onClose: () => void }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copy() {
    if (url === null) return
    setCopyState(await copyText(url) ? 'copied' : 'failed')
  }

  function close() {
    setCopyState('idle')
    onClose()
  }

  return <Dialog open={url !== null} onClose={close} size="sm" titleId="rotated-link-title" descriptionId="rotated-link-description">
    <div className="p-5"><DialogHeader title="Invitation link rotated" titleId="rotated-link-title" description="Use this new canonical link when sharing the invitation." descriptionId="rotated-link-description" onClose={close} />
      <p className="mt-4 break-all rounded-lg bg-surface-muted p-3 text-sm" data-current-private-url>{url}</p>
      {copyState !== 'idle' && <p className={`mt-3 text-sm ${copyState === 'failed' ? 'text-danger' : 'text-foreground-muted'}`} role={copyState === 'failed' ? 'alert' : 'status'}>{copyState === 'copied' ? 'New invitation link copied.' : 'Unable to copy the new invitation link.'}</p>}
      <DialogFooter className="mt-5"><Button type="button" variant="secondary" onClick={close}>Close</Button><Button type="button" onClick={() => { void copy() }}>Copy new link</Button></DialogFooter>
    </div>
  </Dialog>
}
