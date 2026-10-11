import { useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../../components/ui/Dialog'
import { Input } from '../../../components/ui/Input'
import { Text } from '../../../components/ui/Text'
import type { WebsiteSection } from '../types'

export function BlankSectionRenameDialog({ section, pending, onClose, onRename }: { section: WebsiteSection; pending: boolean; onClose: () => void; onRename: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState(section.editorName ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  return <Dialog open onClose={onClose} closeDisabled={pending} titleId="blank-section-rename-title" descriptionId="blank-section-rename-description" size="sm" initialFocusRef={inputRef}>
    <DialogHeader title="Rename Section" titleId="blank-section-rename-title" description="This name appears only in the editor." descriptionId="blank-section-rename-description" onClose={onClose} closeDisabled={pending} />
    <form className="mt-4" onSubmit={async (event) => { event.preventDefault(); if (await onRename(name)) onClose() }}>
      <label className="text-sm font-medium" htmlFor="blank-section-name">Section name</label>
      <Input ref={inputRef} id="blank-section-name" className="mt-1" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
      <DialogFooter className="mt-5"><Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || !name.trim()}>{pending ? 'Saving…' : 'Rename'}</Button></DialogFooter>
    </form>
  </Dialog>
}

export function BlankSectionDeleteDialog({ section, pending, onClose, onDelete }: { section: WebsiteSection; pending: boolean; onClose: () => void; onDelete: () => Promise<boolean> }) {
  const label = section.editorName ?? 'this Section'
  return <Dialog open onClose={onClose} closeDisabled={pending} titleId="blank-section-delete-title" descriptionId="blank-section-delete-description" size="sm">
    <DialogHeader title={`Delete ${label}?`} titleId="blank-section-delete-title" onClose={onClose} closeDisabled={pending} />
    <div className="mt-3" id="blank-section-delete-description"><Text>Its blocks will be removed. Referenced Media Library assets will be kept.</Text><Text className="mt-3" variant="muted">This action cannot be undone.</Text></div>
    <DialogFooter className="mt-5"><Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button><Button type="button" variant="danger" disabled={pending} onClick={async () => { if (await onDelete()) onClose() }}>{pending ? 'Deleting…' : 'Delete'}</Button></DialogFooter>
  </Dialog>
}
