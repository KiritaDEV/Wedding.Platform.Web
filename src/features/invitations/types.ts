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
export type TrustedAccessSummary = { hasTrustedBrowser: boolean; hasPendingAccessRequest: boolean }
export type TrustedAccessResetResult = { changed: boolean; trustState: 'unclaimed'; hasPendingAccessRequest: false }
export type PrivateInvitationLink = { path: string }
export type PrivateInvitationLinkRotationResult = { privateInvitation: PrivateInvitationLink; trustedAccess: TrustedAccessSummary }
export type InvitationAccessAuditType = 'trusted_access_claimed' | 'access_transfer_requested' | 'access_transfer_approved' | 'access_transfer_rejected' | 'access_transfer_expired' | 'access_transfer_invalidated' | 'trusted_access_reset' | 'private_link_rotated'
export type InvitationAccessAuditEntry = {
  id: string
  type: InvitationAccessAuditType
  occurredAt: string
  actor: { type: 'management_user'; name: string | null } | { type: 'private_browser'; browserFamily: string | null; platform: string | null } | { type: 'system' }
  details: { reason?: 'invitation_inactive' | 'trusted_access_reset' | 'private_link_rotated'; requesterBrowserFamily?: string | null; requesterPlatform?: string | null } | null
}
export type InvitationAccessAuditResult = { data: InvitationAccessAuditEntry[]; meta: { nextCursor: string | null } }
export type RsvpSubmissionEntry = {
  id: string
  createdAt: string
  actorType: 'management_user' | 'private_invitation'
  actorName: string | null
  note: string | null
  items: { guestId: string; guestName: string; response: Exclude<GuestRsvpStatus, 'pending'> | null }[]
}
export type RsvpHistoryResult = { data: RsvpSubmissionEntry[]; meta: { nextCursor: string | null } }
export type ManagementRsvpResult = {
  changed: boolean
  rsvp: InvitationListItem['rsvp']
  guests: { id: string; rsvpResponse: Exclude<GuestRsvpStatus, 'pending'> | null }[]
  lastResponse: string | null
}
export type InvitationListItem = {
  id: string; customName: string | null; effectiveName: string; status: InvitationStatus; guestCount: number; totalGuestCount: number
  rsvp: { status: InvitationRsvpStatus; attendingCount: number; declinedCount: number; pendingCount: number }
  lastResponse: string | null; canPermanentlyDelete: boolean; trustedAccess: TrustedAccessSummary; guests: InvitationListGuest[]; createdAt: string
}
export type InvitationListMeta = {
  pagination: { currentPage: number; lastPage: number; perPage: number; total: number }
  summary: { activeInvitations: number; guests: number; attending: number; declined: number; pending: number }
  lifecycleCounts: { all: number; active: number; inactive: number }
}
export type InvitationListResult = { data: InvitationListItem[]; meta: InvitationListMeta }
export type InvitationListQuery = {
  q: string; lifecycle: InvitationLifecycle; relationships: GuestRelationship[]; sides: GuestSide[]
  roleIds: string[]; rsvpStatuses: InvitationRsvpStatus[]; guestResponses: GuestRsvpStatus[]; sort: InvitationSort; page: number
}
export type InvitationOption = { id: string; effectiveName: string; status: InvitationStatus; guestCount: number }

export type Invitation = {
  id: string
  customName: string | null
  effectiveName: string
  status: InvitationStatus
  canPermanentlyDelete: boolean
  trustedAccess: TrustedAccessSummary
  privateInvitation?: PrivateInvitationLink
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
