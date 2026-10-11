import type { CSSProperties, ReactNode } from 'react'
import type { ScheduleLayoutAppearance, ScheduleTypographyRole } from '../websiteElements/scheduleAppearance'
import { resolveRuntimeTextAppearance, resolveRuntimeTextResources } from '../websitePresentation/runtimeTextAppearance'
import { elementFontSizes, elementLineHeights, elementLetterSpacings } from './elementTypography'
import { scopedColorPreviewTarget, useEditorColorPreview } from '../websiteEditor/colorPreview'
import type { TemplateDesignLibrary, ResolvedDesignContext } from '../websiteCapabilities/types'
import type { ProjectColor } from '../websiteColors/projectColors'
import type { ResponsiveViewport } from '../websiteEditor/types'

/** One role renderer serves all layouts and keeps color previews placement-scoped. */
export function ScheduleTypography({ role, appearance, elementId, sectionId, mode, viewport, templateKey, library, projectColors, context, children, href }: {
  role: ScheduleTypographyRole; appearance: ScheduleLayoutAppearance; elementId: string; sectionId: string;
  mode: 'editor' | 'public'; viewport: ResponsiveViewport; templateKey: string; library?: TemplateDesignLibrary;
  projectColors: readonly ProjectColor[]; context?: ResolvedDesignContext | null; children: ReactNode; href?: string;
}) {
  const preview = useEditorColorPreview(scopedColorPreviewTarget(sectionId, `${elementId}:schedule-${role}:color`), mode === 'editor')
  const value = resolveRuntimeTextAppearance({ shared: appearance.typography?.[role] }, viewport)
  const resources = library ? resolveRuntimeTextResources(value, { templateKey, library, projectColors, context }) : undefined
  // Omitted values inherit existing Schedule CSS rather than changing old blocks.
  const style: CSSProperties = {
    fontFamily: value.fontFamilyId ? resources?.fontFamily : undefined,
    fontSize: value.fontSize ? elementFontSizes[value.fontSize] : undefined,
    fontWeight: value.fontWeight,
    fontStyle: value.italic === undefined ? undefined : value.italic && resources?.supportsItalic ? 'italic' : 'normal',
    lineHeight: value.lineHeight ? elementLineHeights[value.lineHeight] : undefined,
    letterSpacing: value.letterSpacing ? elementLetterSpacings[value.letterSpacing] : undefined,
    textAlign: value.alignment,
    width: role === 'activityMapLink' && value.alignment ? '100%' : undefined,
    color: preview ?? (value.colorId ? resources?.color : undefined),
    textDecorationLine: value.underline === undefined && value.strikethrough === undefined ? undefined : [(value.underline ?? role === 'activityMapLink') && 'underline', value.strikethrough && 'line-through'].filter(Boolean).join(' ') || 'none',
  }
  const className = { dayHeading: 'schedule-day-heading', activityTime: 'schedule-time', activityTitle: 'schedule-title', activityDescription: 'schedule-description', activityLocation: 'schedule-location', activityMapLink: 'schedule-map' }[role]
  if (role === 'dayHeading') return <h3 className={className} style={style}>{children}</h3>
  if (role === 'activityMapLink') return <a className={className} style={style} href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  return <div className={className} style={style}>{children}</div>
}
