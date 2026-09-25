import { describe, expect, it } from 'vitest'
import { accessActivityLabels, auditActorLabel, invalidationReasonLabels } from './accessActivityPresentation'

describe('access activity presentation', () => {
  it('labels every canonical event and invalidation reason', () => {
    expect(Object.keys(accessActivityLabels)).toEqual([
      'trusted_access_claimed', 'access_transfer_requested', 'access_transfer_approved', 'access_transfer_rejected',
      'access_transfer_expired', 'access_transfer_invalidated', 'trusted_access_reset', 'private_link_rotated',
    ])
    expect(invalidationReasonLabels).toEqual({ invitation_inactive: 'Cancelled because the invitation was deactivated', trusted_access_reset: 'Cancelled when trusted access was reset', private_link_rotated: 'Cancelled when the private invitation link was rotated' })
  })

  it('renders bounded actor snapshots without identifiers or secrets', () => {
    expect(auditActorLabel({ type: 'management_user', name: 'Event Owner' })).toBe('Event Owner')
    expect(auditActorLabel({ type: 'private_browser', browserFamily: 'Chrome', platform: 'Windows' })).toBe('Chrome on Windows')
    expect(auditActorLabel({ type: 'private_browser', browserFamily: null, platform: null })).toBe('Private browser')
    expect(auditActorLabel({ type: 'system' })).toBe('System')
  })
})
