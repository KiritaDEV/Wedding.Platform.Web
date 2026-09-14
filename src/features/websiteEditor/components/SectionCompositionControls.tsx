import { useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../../components/ui/Dialog'
import type { ResponsiveViewport } from '../types'

const label = (viewport: ResponsiveViewport) => viewport[0].toUpperCase() + viewport.slice(1)

export function SectionCompositionControls({ viewport, source, dirty, pending, onCustomize, onReset }: {
  viewport: ResponsiveViewport
  source: 'shared' | 'custom'
  dirty: boolean
  pending: boolean
  onCustomize: () => void
  onReset: () => void
}) {
  const [confirmReset, setConfirmReset] = useState(false)
  const actionRef = useRef<HTMLButtonElement>(null)
  const target = label(viewport)
  const close = () => { setConfirmReset(false); window.setTimeout(() => actionRef.current?.focus(), 0) }
  return <>
    <div data-section-composition-controls className="mx-1 mb-4 flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <span className="text-sm font-medium">{target} · {source === 'custom' ? 'Custom' : 'Shared'}</span>
      {source === 'shared'
        ? <Button ref={actionRef} size="sm" variant="secondary" disabled={dirty || pending} title={dirty ? 'Save or discard changes before customizing this device.' : undefined} onClick={onCustomize}>Customize {target}</Button>
        : <Button ref={actionRef} size="sm" variant="secondary" disabled={dirty || pending} title={dirty ? 'Save or discard changes before resetting this device.' : undefined} onClick={() => setConfirmReset(true)}>Reset to shared</Button>}
    </div>
    <Dialog open={confirmReset} onClose={close} size="sm" titleId="reset-composition-title" descriptionId="reset-composition-description">
      <DialogHeader title={`Reset ${target} to shared?`} titleId="reset-composition-title" description={`This will permanently remove the custom ${target} layout and content for this section. ${target} will use the shared design again.`} descriptionId="reset-composition-description" />
      <DialogFooter className="mt-5">
        <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
        <Button type="button" variant="danger" onClick={() => { onReset(); close() }}>Reset to shared</Button>
      </DialogFooter>
    </Dialog>
  </>
}
