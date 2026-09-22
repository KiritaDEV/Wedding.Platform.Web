import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildInvitationPayload, createInvitationDraftId, effectiveInvitationName, hydrateInvitationDraft, invitationFormSchema, newGuestDraft, normalizeInvitationIdentity, setGuestRoleSelection } from './invitationForm'
import type { Invitation, InvitationFormDraft } from './types'

const guest = (firstName: string, lastName: string | null = null) => ({ ...newGuestDraft(firstName), firstName, lastName })

describe('Invitation form domain', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('creates stable local IDs when randomUUID is unavailable on an HTTP LAN origin', () => {
    vi.stubGlobal('crypto', {})
    const first = createInvitationDraftId('guest')
    const second = createInvitationDraftId('guest')
    expect(first).toMatch(/^guest-/)
    expect(second).toMatch(/^guest-/)
    expect(second).not.toBe(first)
    expect(newGuestDraft().rowKey).toMatch(/^guest-/)
  })

  it('mirrors the canonical derived-name rules in visible Guest order', () => {
    expect(effectiveInvitationName('', [guest('Maria', 'Santos')])).toBe('Maria Santos')
    expect(effectiveInvitationName('', [guest('Neil', 'Barnedo'), guest('Hazel', 'Barnedo')])).toBe('Neil Barnedo & Hazel Barnedo')
    expect(effectiveInvitationName('', [guest('Neil', 'Barnedo'), guest('Hazel', 'Barnedo'), guest('Ana')])).toBe('Neil Barnedo, Hazel Barnedo + 1 guest')
    expect(effectiveInvitationName('', [guest('Neil', 'Barnedo'), guest('Hazel', 'Barnedo'), guest('A'), guest('B'), guest('C'), guest('D')])).toBe('Neil Barnedo, Hazel Barnedo + 4 guests')
    expect(effectiveInvitationName('  Ceremony   Party ', [guest('Ignored')])).toBe('Ceremony Party')
    expect(effectiveInvitationName('', [guest('First'), guest('Second'), guest('Third')])).toBe('First, Second + 1 guest')
  })

  it('detects exact normalized draft duplicates without fuzzy matching', () => {
    const candidate = (firstName: string, lastName: string | null) => ({ customName: '', guests: [guest(firstName, lastName), guest(' neil ', ' BARNEDO ')] })
    expect(invitationFormSchema.safeParse(candidate('Neil', 'Barnedo')).success).toBe(false)
    expect(invitationFormSchema.safeParse(candidate('Neil', '  barnedo  ')).success).toBe(false)
    expect(invitationFormSchema.safeParse({ customName: '', guests: [guest('Maria', null), guest(' maria ', '')] }).success).toBe(false)
    expect(invitationFormSchema.safeParse(candidate('N\u00e9il', 'Barnedo')).success).toBe(true)
    expect(invitationFormSchema.safeParse(candidate('Neil!', 'Barnedo')).success).toBe(true)
    expect(normalizeInvitationIdentity(' Jose\u0301 ')).toBe(normalizeInvitationIdentity('JOS\u00c9'))
  })

  it('hydrates persisted IDs and roles and emits one atomic final-state payload', () => {
    const invitation: Invitation = {
      id: 'invitation', customName: 'Party', effectiveName: 'Party', status: 'active',
      guests: [{ id: 'guest-1', firstName: 'Ana', lastName: null, relationship: 'friend', side: 'bride', weddingRoles: [{ id: 'role-1', key: 'bridesmaid', name: 'Bridesmaid', isBuiltin: true }] }],
    }
    const draft = hydrateInvitationDraft(invitation)
    draft.guests.push({ ...guest('Pedro'), relationship: 'colleague', side: 'groom', customWeddingRoleKeys: ['reader'] })
    const payload = buildInvitationPayload(draft, [{ clientKey: 'reader', name: 'Reader' }, { clientKey: 'unused', name: 'Unused' }])
    expect(payload.guests[0]).toMatchObject({ id: 'guest-1', weddingRoleIds: ['role-1'], relationship: 'friend', side: 'bride' })
    expect(payload.guests[1]).not.toHaveProperty('id')
    expect(payload.customRoles).toEqual([{ clientKey: 'reader', name: 'Reader' }])
  })

  it('uses one default Guest and canonical classification defaults', () => {
    const draft: InvitationFormDraft = { customName: '', guests: [newGuestDraft('row')] }
    expect(draft.guests).toHaveLength(1)
    expect(draft.guests[0]).toMatchObject({ relationship: 'guest_other', side: 'unspecified', weddingRoleIds: [], customWeddingRoleKeys: [] })
  })

  it('updates only Wedding Role leaves and cannot replace unrelated Guest state', () => {
    const setValue = vi.fn()
    setGuestRoleSelection(setValue, 1, ['best-man'], ['reader'])

    expect(setValue).toHaveBeenNthCalledWith(1, 'guests.1.weddingRoleIds', ['best-man'], { shouldDirty: true, shouldValidate: true })
    expect(setValue).toHaveBeenNthCalledWith(2, 'guests.1.customWeddingRoleKeys', ['reader'], { shouldDirty: true, shouldValidate: true })
    expect(setValue).not.toHaveBeenCalledWith('guests.1', expect.anything(), expect.anything())
  })
})
