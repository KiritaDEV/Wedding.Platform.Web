import { Menu, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { EventDetail } from '../types'
import { EventWorkspaceNavigation } from './EventWorkspaceNavigation'

type Props = {
  event: EventDetail
  open: boolean
  onOpen: () => void
  onClose: () => void
}

export function EventWorkspaceMobileNav({ event, open, onOpen, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function close() {
    onClose()
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex h-12 items-center border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <button ref={triggerRef} className="mr-2 grid size-9 place-items-center rounded-lg hover:bg-surface-muted" type="button" onClick={onOpen} aria-label="Open Event navigation">
          <Menu aria-hidden="true" size={19} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{event.name}</p>
          <p className="text-[11px] text-foreground-muted">Event workspace</p>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="m-0 h-dvh max-h-none w-[min(20rem,calc(100%-2rem))] max-w-none border-0 border-r border-border bg-surface p-0 text-foreground shadow-[var(--shadow-dialog)] lg:hidden"
        aria-label={`${event.name} navigation`}
        onCancel={(cancelEvent) => { cancelEvent.preventDefault(); close() }}
        onClose={() => { if (open) close() }}
        onClick={(clickEvent) => { if (clickEvent.target === clickEvent.currentTarget) close() }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold">Event navigation</span>
            <button className="grid size-8 place-items-center rounded-lg hover:bg-surface-muted" type="button" onClick={close} aria-label="Close Event navigation">
              <X aria-hidden="true" size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <EventWorkspaceNavigation event={event} onNavigate={close} />
          </div>
        </div>
      </dialog>
    </>
  )
}
