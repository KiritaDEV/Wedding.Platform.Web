import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { designColor, fontFamily } from '../../websiteCapabilities/lookup'
import type { ResolvedDesignContext, SectionCapability, TemplateDesignLibrary } from '../../websiteCapabilities/types'
import { resetSectionDesignDefault, sectionDesignDefaultControls, setSectionDesignDefault } from '../sectionDesignDefaults'
import type { SectionDesignDefaults, WebsiteSectionAppearance } from '../types'
import { FontPicker } from './FontPicker'

export function SectionDesignDefaultsPanel({
  appearance,
  capability,
  defaults,
  resolved,
  library,
  saving,
  disabled,
  error,
  onChange,
}: {
  appearance: WebsiteSectionAppearance
  capability: SectionCapability
  defaults: SectionDesignDefaults
  resolved: ResolvedDesignContext | null
  library: TemplateDesignLibrary
  saving: boolean
  disabled: boolean
  error: string | null
  onChange: (defaults: SectionDesignDefaults) => void
}) {
  const controls = sectionDesignDefaultControls(capability, appearance)
  if (!resolved || controls.length === 0) return null

  return <section className="border-t border-border pt-5" aria-labelledby="section-design-defaults-heading">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold" id="section-design-defaults-heading">Design Defaults</h3>
        <p className="mt-1 text-xs text-foreground-muted">Inherited from the Project unless overridden here.</p>
      </div>
      <Button size="sm" variant="secondary" type="button" disabled={saving || disabled || Object.keys(defaults).length === 0} onClick={() => onChange({})}>Restore Section Design Defaults</Button>
    </div>
    {disabled && <p className="mt-3 rounded-md bg-surface-muted p-2.5 text-xs text-foreground-muted">Save the presentation and layout changes before editing Design Defaults.</p>}
    {error && <p className="mt-3 rounded-md bg-danger-muted p-2.5 text-xs text-danger" role="alert">{error}</p>}
    <div className="mt-4 space-y-4">
      {controls.map((control) => {
        const overridden = defaults[control.key] !== undefined
        const value = defaults[control.key] ?? resolved[control.key]
        const options = control.allowedIds.map((id) => {
          const entry = control.kind === 'font' ? fontFamily(library, id) : designColor(library, id)
          return { value: id, label: entry?.displayName ?? id }
        })
        const color = control.kind === 'color' ? designColor(library, value) : undefined
        return <div key={control.key}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="text-xs font-medium" htmlFor={`section-design-${control.key}`}>{control.label}</label>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${overridden ? 'text-accent' : 'text-foreground-muted'}`}>{overridden ? 'Section override' : 'Project default'}</span>
          </div>
          <div className="flex items-center gap-2">
            {color && <span className="size-6 shrink-0 rounded-full border border-border" style={{ backgroundColor: color.value }} aria-hidden="true" />}
            {control.kind === 'font' ? <FontPicker id={`section-design-${control.key}`} value={value} role={control.key === 'headingFontId' ? 'heading' : 'body'} library={library} inheritedLabel="Project default" disabled={saving || disabled} onChange={(next) => onChange(setSectionDesignDefault(defaults, control.key, next))} /> : <Select id={`section-design-${control.key}`} className="min-w-0 flex-1" value={value} options={options} disabled={saving || disabled} aria-label={control.label} onChange={(next) => onChange(setSectionDesignDefault(defaults, control.key, next))} />}
            {overridden && <Button size="sm" variant="ghost" type="button" disabled={saving || disabled} onClick={() => onChange(resetSectionDesignDefault(defaults, control.key))}>Use Project Default</Button>}
          </div>
        </div>
      })}
    </div>
  </section>
}
