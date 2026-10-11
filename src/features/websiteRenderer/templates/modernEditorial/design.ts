import type { CSSProperties } from 'react'
import type { WebsiteDesignSettings } from '../../../websiteEditor/types'
import { modernPaletteCatalog, modernTypographyCatalog, resolveGlobalDesignTokens } from '../../../websiteTemplates/design/catalogs'

export function resolveModernEditorialDesign(settings: WebsiteDesignSettings): CSSProperties {
  const tokens = resolveGlobalDesignTokens(settings, modernPaletteCatalog, modernTypographyCatalog, {
    colorTheme: 'ink',
    fontSet: 'editorial',
  })
  const { color, typography } = tokens

  return {
    '--me-page': color.canvas,
    '--me-surface': color.surface,
    '--me-text': color.text,
    '--me-theme-text': color.text,
    '--me-muted': color.textMuted,
    '--me-section-body': color.textMuted,
    '--me-accent': color.accent,
    '--me-section-accent': color.accent,
    '--me-accent-contrast': color.accentContrast,
    '--me-border': color.border,
    '--me-heading-font': typography.heading,
    '--me-body-font': typography.body,
    '--me-rule-width': settings.artStyle === 'rule' ? '4px' : '1px',
    '--me-frame': settings.artStyle === 'frame' ? `inset 0 0 0 12px ${color.canvas}, inset 0 0 0 13px ${color.border}` : 'none',
    '--me-offset': settings.artStyle === 'offset' ? '2.5rem' : '0rem',
  } as CSSProperties
}
