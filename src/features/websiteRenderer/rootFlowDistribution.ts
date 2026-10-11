import type { CSSProperties } from 'react'
import type { WebsiteSectionAppearance } from '../websiteEditor/types'
import { INNER_SPACING_CSS, type InnerSpacing } from '../websiteElements/group'

export type RootVerticalDistribution = 'packed' | 'space-between'

/** A minimum, never a fixed height: overflowing roots keep their intrinsic size. */
export function heroUsableMinimumHeight(height: WebsiteSectionAppearance['height'], spacing: InnerSpacing): CSSProperties['minHeight'] {
  if (!height) return undefined
  const top = INNER_SPACING_CSS[spacing.top ?? 'none']
  const bottom = INNER_SPACING_CSS[spacing.bottom ?? 'none']
  // Unitless zero is valid padding, but calc() subtraction requires lengths.
  return `max(0px, calc(${height.value}${height.unit} - ${top === '0' ? '0px' : top} - ${bottom === '0' ? '0px' : bottom}))`
}

export function setRootVerticalDistribution(appearance: WebsiteSectionAppearance, value: RootVerticalDistribution): WebsiteSectionAppearance {
  const next = { ...appearance }
  if (value === 'packed') delete next.rootVerticalDistribution
  else next.rootVerticalDistribution = value
  return next
}
