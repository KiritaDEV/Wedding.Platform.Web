import type { InvitationAccessAuditEntry, InvitationAccessAuditType } from './types'

export const accessActivityLabels: Record<InvitationAccessAuditType, string> = {
  trusted_access_claimed: 'Trusted access established',
  access_transfer_requested: 'Access requested',
  access_transfer_approved: 'Access request approved',
  access_transfer_rejected: 'Access request rejected',
  access_transfer_expired: 'Access request expired',
  access_transfer_invalidated: 'Access request cancelled',
  trusted_access_reset: 'Trusted access reset',
  private_link_rotated: 'Private invitation link rotated',
}

export const invalidationReasonLabels = {
  invitation_inactive: 'Cancelled because the invitation was deactivated',
  trusted_access_reset: 'Cancelled when trusted access was reset',
  private_link_rotated: 'Cancelled when the private invitation link was rotated',
} as const

export function auditActorLabel(actor: InvitationAccessAuditEntry['actor']): string {
  if (actor.type === 'management_user') return actor.name ?? 'Management user'
  if (actor.type === 'system') return 'System'
  return [actor.browserFamily, actor.platform].filter(Boolean).join(' on ') || 'Private browser'
}
