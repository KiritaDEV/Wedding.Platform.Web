export type InlineFieldPath = readonly (string | number)[]

type InlineTargetBase = {
  sectionId: string
  path: InlineFieldPath
  label: string
  multiline?: boolean
}

export type InlineEditingTarget = InlineTargetBase & (
  | { elementId: string }
  | { elementId?: never }
)

export function inlineTargetKey(target: InlineEditingTarget) {
  return target.elementId
      ? `${target.sectionId}:element:${target.elementId}`
    : `${target.sectionId}:${target.path.join('.')}`
}

export function isStandaloneTextEditingTarget(target: InlineEditingTarget | null) {
  return Boolean(target?.elementId)
}
