import { createContext, useContext } from 'react'
import type { InlineEditingTarget } from './types'

type InlineEditContextValue = {
  activeTarget: InlineEditingTarget | null
  requestEdit: (target: InlineEditingTarget) => void
  updateValue: (target: InlineEditingTarget, value: string) => void
  finishEdit: () => void
}

const InlineEditContext = createContext<InlineEditContextValue | null>(null)

export const InlineEditProvider = InlineEditContext.Provider
export function useInlineEdit() { return useContext(InlineEditContext) }
