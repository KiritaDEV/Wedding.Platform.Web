import { Select } from '../../../components/ui/Select'
import { InspectorField, InspectorSection } from './InspectorPrimitives'
import { WebsiteColorSwatchControl } from './WebsiteColorSwatchControl'
import type { ScheduleElement } from '../../websiteElements/types'
import type { ScheduleLayoutAppearance } from '../../websiteElements/scheduleAppearance'
import type { TemplateDesignLibrary } from '../../websiteCapabilities/types'
import type { ProjectColor } from '../../websiteColors/projectColors'

export function ScheduleLayoutEditor({ element, library, projectColors, onAddColor, onChange }: {
  element: ScheduleElement; library: TemplateDesignLibrary; projectColors: readonly ProjectColor[];
  onAddColor: (value: string) => Promise<ProjectColor>; onChange: (element: ScheduleElement) => void;
}) {
  const appearance = element.appearance ?? {}
  const layout = appearance.layout ?? 'list'
  const set = (key: keyof ScheduleLayoutAppearance, value: unknown) => onChange({ ...element, appearance: { ...appearance, [key]: value } })
  const nested = (group: 'timeline' | 'list' | 'cards', key: string, value: unknown) => {
    const next: Record<string, unknown> = { ...appearance[group], [key]: value }
    if (value === undefined) delete next[key]
    const updated = { ...appearance, [group]: next }
    if (!Object.keys(next).length) delete updated[group]
    onChange({ ...element, appearance: updated })
  }
  const select = (label: string, value: string, choices: readonly (readonly [string, string])[], change: (value: string) => void) => <InspectorField label={label}><Select aria-label={`Schedule ${label}`} value={value} options={choices.map(([value, label]) => ({ value, label }))} onChange={change} /></InspectorField>
  const spaces = [['none', 'None'], ['xs', 'Extra small'], ['s', 'Small'], ['m', 'Medium'], ['l', 'Large'], ['xl', 'Extra large']] as const
  const color = (label: string, group: 'timeline' | 'cards', key: string, role: string) => {
    const values = appearance[group] as Record<string, unknown> | undefined
    return <InspectorField label={label}><WebsiteColorSwatchControl label={`Schedule ${label}`} previewTarget={`${element.id}:schedule-${role}`} colorId={values?.[key] as string | undefined} allowedTemplateColorIds={library.colors.map(({ id }) => id)} templateColors={library.colors} projectColors={projectColors} inheritLabel="Use default" onAddColor={onAddColor} onChange={(value) => nested(group, key, value)} /></InspectorField>
  }
  return <InspectorSection title="Schedule Layout">
    {select('Layout', layout, [['timeline', 'Timeline'], ['list', 'List'], ['cards', 'Cards']], (value) => set('layout', value))}
    {layout !== 'cards' && select('Row spacing', appearance.rowSpacing ?? 'm', spaces, (value) => set('rowSpacing', value))}
    {layout === 'timeline' && <>
      {select('Arrangement', appearance.timeline?.arrangement ?? 'left', [['left', 'Left'], ['alternating', 'Alternating']], (value) => nested('timeline', 'arrangement', value))}
      {select('Marker', appearance.timeline?.marker ?? 'dot', [['dot', 'Dot'], ['number', 'Number'], ['minimal', 'Minimal']], (value) => nested('timeline', 'marker', value))}
      {select('Line width', String(appearance.timeline?.lineWidth ?? 1), [['1', 'Thin'], ['2', 'Medium'], ['3', 'Thick']], (value) => nested('timeline', 'lineWidth', Number(value)))}
      {color('Marker color', 'timeline', 'markerColorId', 'marker')}{color('Line color', 'timeline', 'lineColorId', 'line')}
    </>}
    {layout === 'list' && <>
      {select('Time position', appearance.list?.timePosition ?? 'left', [['left', 'Left column'], ['above', 'Above Activity']], (value) => nested('list', 'timePosition', value))}
      {select('Separation', appearance.list?.separation ?? 'line', [['none', 'None'], ['line', 'Line']], (value) => nested('list', 'separation', value))}
    </>}
    {layout === 'cards' && <>
      {select('Columns', appearance.cards?.columns ?? 'single', [['single', 'Single column'], ['grid', 'Responsive grid']], (value) => nested('cards', 'columns', value))}
      {select('Card gap', appearance.cards?.gap ?? 'm', spaces, (value) => nested('cards', 'gap', value))}
      {select('Card padding', appearance.cards?.padding ?? 'm', spaces, (value) => nested('cards', 'padding', value))}
      {select('Card radius', appearance.cards?.radius ?? 'm', [['none', 'None'], ['s', 'Small'], ['m', 'Medium'], ['l', 'Large']], (value) => nested('cards', 'radius', value))}
      {select('Card border', String(appearance.cards?.borderWidth ?? 1), [['0', 'None'], ['1', 'Thin'], ['2', 'Medium'], ['3', 'Thick']], (value) => nested('cards', 'borderWidth', Number(value)))}
      {select('Card alignment', appearance.cards?.alignment ?? 'start', [['start', 'Start'], ['center', 'Center'], ['end', 'End']], (value) => nested('cards', 'alignment', value))}
      {color('Card background', 'cards', 'backgroundColorId', 'background')}{color('Card border color', 'cards', 'borderColorId', 'border')}
    </>}
  </InspectorSection>
}
