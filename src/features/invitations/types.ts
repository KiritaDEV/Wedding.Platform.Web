export type GuestRelationship = 'guest_other' | 'parent' | 'family_member' | 'friend' | 'colleague'
export type GuestSide = 'unspecified' | 'bride' | 'groom' | 'both'
export type InvitationStatus = 'active' | 'inactive'
export type InvitationLifecycle = 'all' | InvitationStatus
export type InvitationRsvpStatus = 'pending' | 'partial' | 'complete'
export type GuestRsvpStatus = 'pending' | 'attending' | 'declined'
export type GuestStatus = 'active' | 'inactive'
export type InvitationSort = 'recently_added' | 'invitation_asc' | 'invitation_desc' | 'last_response_desc' | 'last_response_asc'

export type WeddingRole = { id: string; key: string | null; name: string; isBuiltin: boolean }
export type DraftWeddingRole = { clientKey: string; name: string }

export type InvitationGuest = {
  id: string
  firstName: string
  lastName: string | null
  relationship: GuestRelationship
  side: GuestSide
  status: GuestStatus
  rsvpResponse: Exclude<GuestRsvpStatus, 'pending'> | null
  canPermanentlyDelete: boolean
  weddingRoles: WeddingRole[]
}

export type InvitationListGuest = InvitationGuest & { rsvpStatus: GuestRsvpStatus }
export type InvitationListItem = {
  id: string; customName: string | null; effectiveName: string; status: InvitationStatus; guestCount: number; totalGuestCount: number
  rsvp: { status: InvitationRsvpStatus; attendingCount: number; declinedCount: number; pendingCount: number }
  lastResponse: string | null; canPermanentlyDelete: boolean; guests: InvitationListGuest[]; createdAt: string
}
export type InvitationListMeta = {
  pagination: { currentPage: number; lastPage: number; perPage: number; total: number }
  summary: { activeInvitations: number; guests: number; attending: number; declined: number; pending: number }
  lifecycleCounts: { all: number; active: number; inactive: number }
}
export type InvitationListResult = { data: InvitationListItem[]; meta: InvitationListMeta }
export type InvitationListQuery = {
  q: string; lifecycle: InvitationLifecycle; relationship: GuestRelationship | ''; side: GuestSide | ''
  weddingRoleId: string; rsvp: GuestRsvpStatus | ''; sort: InvitationSort; page: number
}
export type InvitationOption = { id: string; effectiveName: string; status: InvitationStatus; guestCount: number }

export type Invitation = {
  id: string
  customName: string | null
  effectiveName: string
  status: InvitationStatus
  canPermanentlyDelete: boolean
  guests: InvitationGuest[]
}

export type InvitationGuestInput = {
  id?: string
  firstName: string
  lastName: string | null
  relationship: GuestRelationship
  side: GuestSide
  weddingRoleIds: string[]
  customWeddingRoleKeys: string[]
  status: GuestStatus
}

export type InvitationMutationPayload = {
  customName: string | null
  customRoles: DraftWeddingRole[]
  guests: InvitationGuestInput[]
  deletedGuestIds?: string[]
}

export type GuestDraft = InvitationGuestInput & { rowKey: string; canPermanentlyDelete?: boolean }
export type InvitationFormDraft = { customName: string; guests: GuestDraft[] }
