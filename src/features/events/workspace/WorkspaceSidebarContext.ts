import { createContext, use } from 'react'

export type WorkspaceSidebarContextValue = {
  collapsed: boolean
  toggle: () => void
}

export const WorkspaceSidebarContext = createContext<WorkspaceSidebarContextValue | null>(null)

export function useWorkspaceSidebar(): WorkspaceSidebarContextValue {
  const context = use(WorkspaceSidebarContext)
  if (!context) throw new Error('useWorkspaceSidebar must be used within the authenticated layout.')
  return context
}
