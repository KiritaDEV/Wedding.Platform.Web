import { createContext, use } from 'react'
import type { EventDetail } from '../types'

type EventWorkspaceValue = { event: EventDetail; setEvent: (event: EventDetail) => void }

export const EventWorkspaceContext = createContext<EventWorkspaceValue | null>(null)

export function useEventWorkspace(): EventDetail {
  const value = use(EventWorkspaceContext)
  if (!value) throw new Error('useEventWorkspace must be used within EventWorkspaceLayout.')
  return value.event
}

export function useSetEventWorkspace(): (event: EventDetail) => void {
  const value = use(EventWorkspaceContext)
  if (!value) throw new Error('useSetEventWorkspace must be used within EventWorkspaceLayout.')
  return value.setEvent
}
