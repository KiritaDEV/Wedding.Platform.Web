import type { GuestRelationship, GuestSide } from './types'

export const relationshipLabels: Record<GuestRelationship, string> = { guest_other: 'Guest / Other', parent: 'Parent', family_member: 'Family member', friend: 'Friend', colleague: 'Colleague' }
export const sideLabels: Record<GuestSide, string> = { unspecified: 'Unspecified', bride: 'Bride', groom: 'Groom', both: 'Both' }
