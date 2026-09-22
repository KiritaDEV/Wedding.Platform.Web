import { Trash2 } from 'lucide-react'
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from 'react-hook-form'
import { IconButton } from '../../../components/ui/IconButton'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import type { DraftWeddingRole, InvitationFormDraft, WeddingRole } from '../types'
import { setGuestRoleSelection } from '../invitationForm'
import { WeddingRoleMultiSelect } from './WeddingRoleMultiSelect'

const relationships = [
  { value: 'guest_other', label: 'Guest / Other' }, { value: 'parent', label: 'Parent' },
  { value: 'family_member', label: 'Family member' }, { value: 'friend', label: 'Friend' }, { value: 'colleague', label: 'Colleague' },
]
const sides = [
  { value: 'unspecified', label: 'Unspecified' }, { value: 'bride', label: 'Bride' },
  { value: 'groom', label: 'Groom' }, { value: 'both', label: 'Both' },
]

export function GuestDraftCard({ index, register, control, setValue, errors, catalog, draftRoles, canRemove, disabled, onRemove, onCreateDraftRole }: {
  index: number; register: UseFormRegister<InvitationFormDraft>; control: Control<InvitationFormDraft>; setValue: UseFormSetValue<InvitationFormDraft>; errors: FieldErrors<InvitationFormDraft>
  catalog: WeddingRole[]; draftRoles: DraftWeddingRole[]; canRemove: boolean; disabled: boolean
  onRemove: () => void; onCreateDraftRole: (name: string) => DraftWeddingRole
}) {
  const guestErrors = errors.guests?.[index]
  const weddingRoleIds = useWatch({ control, name: `guests.${index}.weddingRoleIds` }) ?? []
  const customWeddingRoleKeys = useWatch({ control, name: `guests.${index}.customWeddingRoleKeys` }) ?? []
  return <section className="rounded-xl border border-border bg-background p-4" aria-labelledby={`guest-${index}-title`}>
    <div className="mb-4 flex items-center justify-between"><h3 id={`guest-${index}-title`} className="font-semibold">Guest {index + 1}</h3>
      <IconButton type="button" size="sm" variant="danger" disabled={!canRemove || disabled} aria-label={`Remove Guest ${index + 1}`} title={canRemove ? 'Remove Guest' : 'An Invitation must have at least one Guest'} onClick={onRemove}><Trash2 size={16} aria-hidden="true" /></IconButton>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" id={`guest-${index}-first`} error={guestErrors?.firstName?.message}><Input id={`guest-${index}-first`} aria-invalid={!!guestErrors?.firstName} {...register(`guests.${index}.firstName`)} /></Field>
      <Field label="Last name (optional)" id={`guest-${index}-last`} error={guestErrors?.lastName?.message}><Input id={`guest-${index}-last`} {...register(`guests.${index}.lastName`)} /></Field>
      <Field label="Relationship" id={`guest-${index}-relationship`} error={guestErrors?.relationship?.message}><Controller control={control} name={`guests.${index}.relationship`} render={({ field }) => <Select id={`guest-${index}-relationship`} value={field.value} options={relationships} onChange={field.onChange} onBlur={field.onBlur} />} /></Field>
      <Field label="Side" id={`guest-${index}-side`} error={guestErrors?.side?.message}><Controller control={control} name={`guests.${index}.side`} render={({ field }) => <Select id={`guest-${index}-side`} value={field.value} options={sides} onChange={field.onChange} onBlur={field.onBlur} />} /></Field>
      <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium">Wedding Roles</label><WeddingRoleMultiSelect catalog={catalog} draftRoles={draftRoles} selectedRoleIds={weddingRoleIds} selectedDraftKeys={customWeddingRoleKeys} disabled={disabled} onCreateDraftRole={onCreateDraftRole} onChange={(nextRoleIds, nextDraftKeys) => setGuestRoleSelection(setValue, index, nextRoleIds, nextDraftKeys)} /></div>
    </div>
  </section>
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-medium" htmlFor={id}>{label}</label>{children}{error && <p className="mt-1 text-sm text-danger" role="alert">{error}</p>}</div>
}
