import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Button } from '../../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../../components/ui/Dialog'
import { Input } from '../../../components/ui/Input'
import { ApiError } from '../../../lib/api'
import { DiscardChangesDialog } from '../../websiteEditor/components/DiscardChangesDialog'
import { createInvitation, getInvitation, getWeddingRoles, updateInvitation } from '../api'
import { buildInvitationPayload, createInvitationDraftId, effectiveInvitationName, hydrateInvitationDraft, invitationFormSchema, newGuestDraft, normalizeInvitationIdentity } from '../invitationForm'
import type { DraftWeddingRole, Invitation, InvitationFormDraft, WeddingRole } from '../types'
import { GuestDraftCard } from './GuestDraftCard'

type Props = {
  open: boolean
  eventId: string
  mode: 'create' | 'edit'
  invitationId?: string
  onClose: () => void
  onSaved?: (invitation: Invitation) => void
}

const createDefaults = (): InvitationFormDraft => ({ customName: '', guests: [newGuestDraft()] })

export function InvitationFormDialog({ open, eventId, mode, invitationId, onClose, onSaved }: Props) {
  const [catalog, setCatalog] = useState<WeddingRole[]>([])
  const [draftRoles, setDraftRoles] = useState<DraftWeddingRole[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const form = useForm<InvitationFormDraft>({ resolver: zodResolver(invitationFormSchema), defaultValues: createDefaults() })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'guests', keyName: 'fieldKey' })
  const guests = useWatch({ control: form.control, name: 'guests' })
  const customName = useWatch({ control: form.control, name: 'customName' })
  const titleId = `invitation-${mode}-title`

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    let active = true
    queueMicrotask(() => {
      if (!active) return
      setLoading(true)
      setLoadError(null)
      setDraftRoles([])
      const detail = mode === 'edit' && invitationId ? getInvitation(eventId, invitationId, controller.signal) : Promise.resolve(null)
      Promise.all([getWeddingRoles(eventId, controller.signal), detail]).then(([roles, invitation]) => {
        if (!active) return
        setCatalog(roles)
        form.reset(invitation ? hydrateInvitationDraft(invitation) : createDefaults())
      }).catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) setLoadError(error instanceof Error ? error.message : 'Unable to load the Invitation form.')
      }).finally(() => { if (active) setLoading(false) })
    })
    return () => { active = false; controller.abort() }
  }, [eventId, form, invitationId, mode, open])

  function requestClose() {
    if (form.formState.isSubmitting) return
    if (form.formState.isDirty) setDiscardOpen(true)
    else closeNow()
  }

  function closeNow() {
    setDiscardOpen(false)
    setDraftRoles([])
    form.reset(createDefaults())
    onClose()
  }

  function createDraftRole(name: string): DraftWeddingRole {
    const existing = draftRoles.find((role) => normalizeInvitationIdentity(role.name) === normalizeInvitationIdentity(name))
    if (existing) return existing
    const slug = normalizeInvitationIdentity(name).replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '') || 'custom'
    const role = { clientKey: createInvitationDraftId(`role-${slug}`), name }
    setDraftRoles((current) => [...current, role])
    return role
  }

  const submit = form.handleSubmit(async (draft) => {
    form.clearErrors('root')
    try {
      const payload = buildInvitationPayload(draft, draftRoles)
      const saved = mode === 'create'
        ? await createInvitation(eventId, payload)
        : await updateInvitation(eventId, invitationId!, payload)
      form.reset(hydrateInvitationDraft(saved))
      setDraftRoles([])
      onSaved?.(saved)
      onClose()
    } catch (error) {
      if (error instanceof ApiError) {
        Object.entries(error.validationErrors).forEach(([path, messages]) => {
          const message = messages[0]
          const match = /^guests\.(\d+)\.(firstName|lastName|relationship|side)$/.exec(path)
          if (match) form.setError(`guests.${Number(match[1])}.${match[2]}` as `guests.${number}.firstName`, { message })
        })
        form.setError('root.server', { message: error.validationErrors.guests?.[0] ?? error.message })
      } else form.setError('root.server', { message: error instanceof Error ? error.message : 'Unable to save the Invitation.' })
    }
  })

  return <>
    <Dialog open={open} onClose={requestClose} closeDisabled={form.formState.isSubmitting} titleId={titleId} descriptionId={`${titleId}-description`} size="xl" contained mobileFullScreen className="h-[min(90dvh,880px)] max-w-4xl">
      <form className="flex h-full min-h-0 flex-col" onSubmit={submit} noValidate>
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 sm:px-6" title={mode === 'create' ? 'New invitation' : 'Edit invitation'} titleId={titleId} description="Build one Invitation for one or more named Guests." descriptionId={`${titleId}-description`} onClose={requestClose} closeDisabled={form.formState.isSubmitting} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {loading ? <div className="grid min-h-56 place-items-center text-sm text-foreground-muted" role="status">Loading Invitation…</div>
            : loadError ? <div className="rounded-xl bg-danger-muted p-4 text-sm text-danger" role="alert">{loadError}</div>
            : <div className="space-y-5">
              {form.formState.errors.root?.server && <p className="rounded-xl bg-danger-muted p-3 text-sm text-danger" role="alert">{form.formState.errors.root.server.message}</p>}
              <div><label className="block text-sm font-medium" htmlFor="invitation-custom-name">Invitation name <span className="font-normal text-foreground-muted">(optional)</span></label>
                <Input id="invitation-custom-name" className="mt-1" placeholder="e.g. Ceremony Party" {...form.register('customName')} />
                <p className="mt-1.5 text-xs text-foreground-muted">Leave blank and Kirita will derive the name from the Guests.</p>
                <p className="mt-2 text-sm"><span className="text-foreground-muted">Effective name:</span> <strong>{effectiveInvitationName(customName, guests)}</strong></p>
              </div>
              <div className="space-y-4">{fields.map((field, index) => <GuestDraftCard key={field.fieldKey} index={index} register={form.register} control={form.control} setValue={form.setValue} errors={form.formState.errors} catalog={catalog} draftRoles={draftRoles} canRemove={fields.length > 1} disabled={form.formState.isSubmitting} onRemove={() => remove(index)} onCreateDraftRole={createDraftRole} />)}</div>
              <Button type="button" variant="secondary" disabled={form.formState.isSubmitting} onClick={() => { append(newGuestDraft()); setTimeout(() => form.setFocus(`guests.${fields.length}.firstName`), 0) }}><Plus size={16} aria-hidden="true" />Add Guest</Button>
            </div>}
        </div>
        <DialogFooter className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-6">
          <Button type="button" variant="secondary" disabled={form.formState.isSubmitting} onClick={requestClose}>Cancel</Button>
          <Button type="submit" disabled={loading || !!loadError || form.formState.isSubmitting}>{form.formState.isSubmitting ? (mode === 'create' ? 'Creating…' : 'Saving…') : (mode === 'create' ? 'Create invitation' : 'Save changes')}</Button>
        </DialogFooter>
      </form>
    </Dialog>
    <DiscardChangesDialog open={discardOpen} onCancel={() => setDiscardOpen(false)} onDiscard={closeNow} title="Discard Invitation changes?" description="Guests, role selections, and custom roles in this draft will not be saved." />
  </>
}
