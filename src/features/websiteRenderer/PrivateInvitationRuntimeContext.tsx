import type { ReactNode } from 'react'
import { PrivateInvitationRuntimeContext, type PrivateInvitationRendererRuntime } from './privateInvitationRuntime'

export function PrivateInvitationRuntimeProvider({ value, children }: { value?: PrivateInvitationRendererRuntime; children: ReactNode }) {
  return <PrivateInvitationRuntimeContext.Provider value={value ?? null}>{children}</PrivateInvitationRuntimeContext.Provider>
}
