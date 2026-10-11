import { useState } from 'react'
import { Italic, Underline, Strikethrough } from 'lucide-react'
import { Select } from '../../../components/ui/Select'
import { Switch } from '../../../components/ui/Switch'
import { InspectorDisclosure, InspectorField, InspectorSection } from './InspectorPrimitives'
import { FontPicker } from './FontPicker'
import { FONT_SIZE_OPTIONS } from './fontSizeOptions'
import { TextFormattingButton } from './TextFormattingButton'
import { WebsiteColorSwatchControl } from './WebsiteColorSwatchControl'
import { SCHEDULE_TYPOGRAPHY_ROLES, type ScheduleTypographyRole } from '../../websiteElements/scheduleAppearance'
import { changeTextFontFamily, setTextFontWeight, toggleTextItalic, textFontCapabilities, setTextResponsiveProperty, type TextAppearance, type TextFontWeight } from '../../websiteElements/text'
import { curatedTextColors, friendlyFontWeightOptions } from '../../websiteElements/textAppearance'
import type { ScheduleElement } from '../../websiteElements/types'
import type { ResponsiveViewport } from '../types'
import type { TemplateDesignLibrary, ResolvedDesignContext } from '../../websiteCapabilities/types'
import type { ProjectColor } from '../../websiteColors/projectColors'

const roleLabels: Record<ScheduleTypographyRole, string> = { dayHeading: 'Day heading', activityTime: 'Activity time', activityTitle: 'Activity title', activityDescription: 'Activity description', activityLocation: 'Activity location', activityMapLink: 'Activity map link' }
type Props = { element: ScheduleElement; viewport: ResponsiveViewport; library: TemplateDesignLibrary; allowedFontIds: readonly string[]; allowedColorIds: readonly string[]; projectColors: readonly ProjectColor[]; context?: ResolvedDesignContext | null; onAddColor: (value: string) => Promise<ProjectColor>; onChange: (element: ScheduleElement) => void }

export function ScheduleAppearanceEditor(props: Props) {
  const { element, viewport, library, allowedFontIds, allowedColorIds, projectColors, context, onAddColor, onChange } = props
  const [role, setRole] = useState<ScheduleTypographyRole>('dayHeading')
  const appearance = element.appearance ?? {}
  const value = appearance.typography?.[role] ?? {}
  const fontId = value.fontFamilyId ?? context?.bodyFontId
  const changeTypography = (next: TextAppearance) => {
    const typography = { ...appearance.typography }
    if (Object.keys(next).length) typography[role] = next
    else delete typography[role]
    const nextAppearance = { ...appearance }
    if (Object.keys(typography).length) nextAppearance.typography = typography
    else delete nextAppearance.typography
    onChange({ ...element, appearance: Object.keys(nextAppearance).length ? nextAppearance : undefined })
  }
  const setTypography = (key: keyof TextAppearance, next: unknown) => {
    const updated: TextAppearance = { ...value }
    if (next === undefined || next === '') delete updated[key]
    else Object.assign(updated, { [key]: next })
    changeTypography(updated)
  }
  const set = (key: keyof NonNullable<ScheduleElement['appearance']>, next: unknown) => {
    const updated = { ...appearance }
    if (next === undefined || next === '') delete updated[key]
    else Object.assign(updated, { [key]: next })
    onChange({ ...element, appearance: Object.keys(updated).length ? updated : undefined })
  }
  const select = (label: string, current: string, choices: readonly (readonly [string, string])[], change: (next: string) => void) => <InspectorField label={label}><Select aria-label={`Schedule ${label}`} value={current} options={choices.map(([value, label]) => ({ value, label }))} onChange={change} /></InspectorField>
  const responsive = viewport === 'desktop' ? value : { ...value, ...value.responsive?.[viewport] }
  const responsiveControl = (key: 'fontSize' | 'alignment', next: string) => changeTypography(setTextResponsiveProperty(value, viewport, key, (next || undefined) as TextAppearance['fontSize'] | TextAppearance['alignment']))
  const colors = curatedTextColors(library, allowedColorIds, context, value.colorId)
  return <div className="space-y-5" data-schedule-appearance-editor>
    <InspectorDisclosure title="Typography" summary={roleLabels[role]}>
      {select('Typography role', role, SCHEDULE_TYPOGRAPHY_ROLES.map((key) => [key, roleLabels[key]]), (next) => setRole(next as ScheduleTypographyRole))}
      <InspectorField label="Font family"><FontPicker value={value.fontFamilyId ?? ''} role="body" library={{ ...library, fontFamilies: library.fontFamilies.filter(({ id }) => allowedFontIds.includes(id)) }} onChange={(next) => changeTypography(changeTextFontFamily(value, next || undefined, context?.bodyFontId))} /></InspectorField>
      {select('Font weight', String(value.fontWeight ?? ''), [['', 'Use default'], ...friendlyFontWeightOptions(fontId).map(({ value, label }) => [value, label] as const)], (next) => {
        if (!next) { setTypography('fontWeight', undefined); return }
        const weight = Number(next) as TextFontWeight
        const updated = setTextFontWeight(value, fontId, weight)
        // Schedule's emphasized roles inherit 600; explicitly selecting Normal must retain 400.
        if (textFontCapabilities(fontId).weights.includes(weight)) changeTypography({ ...updated, fontWeight: weight })
      })}
      {select('Font size', responsive.fontSize ?? '', [['', 'Use default'], ...FONT_SIZE_OPTIONS.map(({ value, label }) => [value, label] as const)], (next) => responsiveControl('fontSize', next))}
      {select('Alignment', responsive.alignment ?? '', [['', 'Use default'], ['start', 'Left'], ['center', 'Center'], ['end', 'Right']], (next) => responsiveControl('alignment', next))}
      {select('Line height', value.lineHeight ?? '', [['', 'Use default'], ['tight', 'Tight'], ['normal', 'Normal'], ['relaxed', 'Relaxed']], (next) => setTypography('lineHeight', next))}
      {select('Letter spacing', value.letterSpacing ?? '', [['', 'Use default'], ['tight', 'Tight'], ['normal', 'Normal'], ['wide', 'Wide']], (next) => setTypography('letterSpacing', next))}
      <InspectorField label="Color"><WebsiteColorSwatchControl key={`${element.id}:${role}`} label={`${roleLabels[role]} color`} previewTarget={`${element.id}:schedule-${role}:color`} colorId={value.colorId} allowedTemplateColorIds={colors.map(({ id }) => id)} templateColors={colors} projectColors={projectColors} inheritLabel="Use default" onAddColor={onAddColor} onChange={(next) => setTypography('colorId', next)} /></InspectorField>
      <InspectorField label="Formatting"><div className="flex gap-2">
        <TextFormattingButton label="Italic" pressed={value.italic ?? false} disabled={!textFontCapabilities(fontId).italic} onClick={() => changeTypography(toggleTextItalic(value, fontId))}><Italic size={16} /></TextFormattingButton>
        <TextFormattingButton label="Underline" pressed={value.underline ?? role === 'activityMapLink'} onClick={() => setTypography('underline', !(value.underline ?? role === 'activityMapLink'))}><Underline size={16} /></TextFormattingButton>
        <TextFormattingButton label="Strikethrough" pressed={value.strikethrough ?? false} onClick={() => setTypography('strikethrough', !value.strikethrough)}><Strikethrough size={16} /></TextFormattingButton>
      </div></InspectorField>
    </InspectorDisclosure>
    <InspectorSection title="Date & Time Formatting">
      {select('Day date format', appearance.dateFormat ?? '', [['', 'Use existing date'], ['long', 'October 24, 2026'], ['short', 'Oct 24, 2026'], ['weekday', 'Saturday, October 24, 2026']], (next) => set('dateFormat', next))}
      {select('Time format', appearance.timeFormat ?? '12-hour', [['12-hour', '3:00 PM'], ['24-hour', '15:00']], (next) => set('timeFormat', next))}
    </InspectorSection>
    <InspectorSection title="Content Visibility">
      {([['showDescriptions', 'Activity descriptions'], ['showLocations', 'Activity locations'], ['showMapLinks', 'Activity map links']] as const).map(([key, label]) => <div key={key} className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><Switch aria-label={label} checked={appearance[key] !== false} onCheckedChange={(checked) => set(key, checked ? undefined : false)} /></div>)}
    </InspectorSection>
    <InspectorSection title="Spacing & Width" description="Activity spacing uses Row spacing or Card gap in Layout.">
      {select('Day gap', appearance.dayGap ?? '', [['', 'Use default'], ['none', 'None'], ['xs', 'Extra small'], ['s', 'Small'], ['m', 'Medium'], ['l', 'Large'], ['xl', 'Extra large']], (next) => set('dayGap', next))}
      {select('Maximum content width', appearance.contentWidth ?? 'full', [['full', 'Full width'], ['wide', 'Wide (72rem)'], ['medium', 'Medium (48rem)'], ['narrow', 'Narrow (32rem)']], (next) => set('contentWidth', next))}
      {appearance.contentWidth && appearance.contentWidth !== 'full' && select('Content alignment', appearance.contentAlignment ?? 'start', [['start', 'Left'], ['center', 'Center'], ['end', 'Right']], (next) => set('contentAlignment', next))}
    </InspectorSection>
  </div>
}
