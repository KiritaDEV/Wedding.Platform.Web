import type { CSSProperties } from 'react'
import type { WebsiteDesignSettings } from '../../../websiteEditor/types'
import { classicPaletteCatalog, classicTypographyCatalog, resolveGlobalDesignTokens } from '../../../websiteTemplates/design/catalogs'

const patterns: Record<string, string> = {
  minimal: 'radial-gradient(rgb(117 91 70 / 7%) 0.7px, transparent 0.7px)',
  botanical: 'radial-gradient(ellipse at 8% 4%, rgb(112 135 92 / 15%) 0 5%, transparent 5.5%), radial-gradient(ellipse at 94% 18%, rgb(157 91 69 / 12%) 0 7%, transparent 7.5%)',
  woven: 'linear-gradient(45deg, rgb(90 72 58 / 5%) 25%, transparent 25%, transparent 75%, rgb(90 72 58 / 5%) 75%), linear-gradient(45deg, rgb(90 72 58 / 5%) 25%, transparent 25%, transparent 75%, rgb(90 72 58 / 5%) 75%)',
  clean: 'none',
}

export function resolveClassicFilipinianaDesign(settings: WebsiteDesignSettings): CSSProperties {
  const tokens = resolveGlobalDesignTokens(settings, classicPaletteCatalog, classicTypographyCatalog, {
    colorTheme: 'terracotta',
    fontSet: 'editorial',
  })
  const { color, typography } = tokens

  return {
    '--cf-page': color.canvas,
    '--cf-surface': color.surface,
    '--cf-text': color.text,
    '--cf-muted': color.textMuted,
    '--cf-section-body': color.textMuted,
    '--cf-accent': color.accent,
    '--cf-section-accent': color.accent,
    '--cf-theme-page': color.canvas,
    '--cf-theme-surface': color.surface,
    '--cf-theme-text': color.text,
    '--cf-theme-muted': color.textMuted,
    '--cf-theme-accent': color.accent,
    '--cf-theme-accent-contrast': color.accentContrast,
    '--cf-theme-secondary': color.ornament,
    '--cf-theme-border': color.border,
    '--cf-secondary': color.ornament,
    '--cf-border': color.border,
    '--cf-heading-font': typography.heading,
    '--cf-body-font': typography.body,
    backgroundImage: patterns[settings.artStyle] ?? patterns.minimal,
    backgroundSize: settings.artStyle === 'woven' ? '18px 18px' : settings.artStyle === 'minimal' ? '7px 7px' : '100% 100%',
  } as CSSProperties
}
