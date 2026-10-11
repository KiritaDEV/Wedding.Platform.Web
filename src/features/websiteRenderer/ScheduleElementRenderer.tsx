import './scheduleLayouts.css'
import type { CSSProperties } from 'react'
import type { ScheduleElement } from '../websiteElements/types'
import { visibleScheduleDays, isScheduleMapUrl } from '../websiteElements/scheduleContent'
import { scheduleSpacingValues } from '../websiteElements/scheduleAppearance'
import type { TemplateDesignLibrary, ResolvedDesignContext } from '../websiteCapabilities/types'
import { resolveWebsiteColor, type ProjectColor } from '../websiteColors/projectColors'
import { useEditorColorPreview, scopedColorPreviewTarget } from '../websiteEditor/colorPreview'
import { formatScheduleDate, formatScheduleTime } from '../websiteElements/scheduleFormatting'
import { ScheduleTypography } from './ScheduleTypography'
import type { ResponsiveViewport } from '../websiteEditor/types'
export function ScheduleElementRenderer({ element, mode, templateKey, sectionId = '', library, projectColors = [], context, viewport = 'desktop' }: {
  element: ScheduleElement; mode: 'editor' | 'public'; templateKey: string; sectionId?: string;
  library?: TemplateDesignLibrary; projectColors?: readonly ProjectColor[]; context?: ResolvedDesignContext | null; viewport?: ResponsiveViewport;
}) {
  const appearance = element.appearance ?? {}
  const layout = appearance.layout ?? 'list'
  const markerPreview = useEditorColorPreview(scopedColorPreviewTarget(sectionId, `${element.id}:schedule-marker`), mode === 'editor')
  const linePreview = useEditorColorPreview(scopedColorPreviewTarget(sectionId, `${element.id}:schedule-line`), mode === 'editor')
  const backgroundPreview = useEditorColorPreview(scopedColorPreviewTarget(sectionId, `${element.id}:schedule-background`), mode === 'editor')
  const borderPreview = useEditorColorPreview(scopedColorPreviewTarget(sectionId, `${element.id}:schedule-border`), mode === 'editor')
  const color = (id: string | undefined, fallback: string) => (library ? resolveWebsiteColor(id, library, projectColors) : undefined) ?? fallback
  const style = {
    maxWidth: { full: '100%', wide: '72rem', medium: '48rem', narrow: '32rem' }[appearance.contentWidth ?? 'full'],
    marginInlineStart: appearance.contentAlignment === 'center' || appearance.contentAlignment === 'end' ? 'auto' : undefined,
    marginInlineEnd: appearance.contentAlignment === 'center' ? 'auto' : undefined,
    '--schedule-day-gap': appearance.dayGap ? scheduleSpacingValues[appearance.dayGap] : undefined,
    '--schedule-row-spacing': appearance.rowSpacing ? scheduleSpacingValues[appearance.rowSpacing] : templateKey === 'modern-editorial-v1' ? '1.25rem' : '1rem',
    '--schedule-marker-color': markerPreview ?? color(appearance.timeline?.markerColorId ?? context?.accentColorId, 'currentColor'),
    '--schedule-line-color': linePreview ?? color(appearance.timeline?.lineColorId, 'currentColor'),
    '--schedule-line-width': `${appearance.timeline?.lineWidth ?? 1}px`,
    '--schedule-card-gap': scheduleSpacingValues[appearance.cards?.gap ?? 'm'],
    '--schedule-card-padding': scheduleSpacingValues[appearance.cards?.padding ?? 'm'],
    '--schedule-card-background': backgroundPreview ?? color(appearance.cards?.backgroundColorId, 'transparent'),
    '--schedule-card-border': borderPreview ?? color(appearance.cards?.borderColorId, 'currentColor'),
    '--schedule-card-border-width': `${appearance.cards?.borderWidth ?? 1}px`,
    '--schedule-card-radius': { none: '0', s: '0.25rem', m: '0.5rem', l: '1rem' }[appearance.cards?.radius ?? 'm'],
    '--schedule-card-alignment': { start: 'start', center: 'center', end: 'end' }[appearance.cards?.alignment ?? 'start'],
  } as CSSProperties
  if (!element.days) throw new Error('Schedule renderer requires resolved content.')
  const typography = { appearance, elementId: element.id, sectionId, mode, viewport, templateKey, library, projectColors, context }
  const time = (value: string | null) => formatScheduleTime(value, appearance.timeFormat)
  const days = visibleScheduleDays(element.days)
  if (!days.length) return mode === 'public' ? null : <div data-schedule-empty className="rounded-md border border-dashed border-current/30 p-4 text-sm opacity-70">Add an Activity to this Schedule.</div>
  return <div data-schedule-block data-schedule-layout={layout} data-schedule-arrangement={appearance.timeline?.arrangement ?? 'left'} data-schedule-marker={appearance.timeline?.marker ?? 'dot'} data-schedule-time-position={appearance.list?.timePosition ?? 'left'} data-schedule-separation={appearance.list?.separation ?? 'line'} data-schedule-columns={appearance.cards?.columns ?? 'single'} className="schedule-layout" style={style}>
    {days.map((day, index) => <div className="schedule-day" key={day.id}>
      {days.length > 1 && <ScheduleTypography {...typography} role="dayHeading">{day.title?.trim() || (day.date ? formatScheduleDate(day.date, appearance.dateFormat) : `Day ${index + 1}`)}</ScheduleTypography>}
      <ol className="schedule-activities" role="list">{day.activities.map((activity, ai) => <li className="schedule-activity" key={activity.id}>
        {layout === 'timeline' && <span className="schedule-marker" aria-hidden="true">{appearance.timeline?.marker === 'number' ? ai + 1 : null}</span>}
        <div className="schedule-activity-body">
          <ScheduleTypography {...typography} role="activityTime">{time(activity.startTime) && <time dateTime={activity.startTime!}>{time(activity.startTime)}</time>}{time(activity.endTime) && <> {'\u2013'} <time dateTime={activity.endTime!}>{time(activity.endTime)}</time></>}</ScheduleTypography>
          <div className="schedule-copy"><ScheduleTypography {...typography} role="activityTitle">{activity.title?.trim()}</ScheduleTypography>
            {appearance.showDescriptions !== false && activity.description?.trim() && <ScheduleTypography {...typography} role="activityDescription">{activity.description}</ScheduleTypography>}
            {appearance.showLocations !== false && activity.location?.trim() && <ScheduleTypography {...typography} role="activityLocation">{activity.location}</ScheduleTypography>}
            {appearance.showMapLinks !== false && activity.mapUrl && isScheduleMapUrl(activity.mapUrl) && <ScheduleTypography {...typography} role="activityMapLink" href={activity.mapUrl}>View map</ScheduleTypography>}
          </div>
        </div>
      </li>)}</ol>
    </div>)}
  </div>
}
