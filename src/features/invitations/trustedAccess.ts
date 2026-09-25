import type { InvitationListItem } from './types'

export function hasRecoverableTrustedAccess(invitation: InvitationListItem): boolean {
  return invitation.trustedAccess.hasTrustedBrowser || invitation.trustedAccess.hasPendingAccessRequest
}
