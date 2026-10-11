import { createContext, useContext } from 'react'
import type { PrivateInvitationRuntime, PrivateRsvpSubmission } from '../privateEventSite/api'

export type PrivateInvitationRendererRuntime = PrivateInvitationRuntime & {
  opening: boolean
  openError: boolean
  onOpen: () => void
  onSubmitRsvp: (responses: Array<{ guestId: string; response: 'attending' | 'declined' }>) => Promise<PrivateRsvpSubmission>
  accessBusy: boolean
  onRequestAccess: () => Promise<void>
  onResolveAccess: (decision: 'approve' | 'reject') => Promise<void>
}

export const PrivateInvitationRuntimeContext = createContext<PrivateInvitationRendererRuntime | null>(null)

export function usePrivateInvitationRuntime(): PrivateInvitationRendererRuntime | null {
  return useContext(PrivateInvitationRuntimeContext)
}
