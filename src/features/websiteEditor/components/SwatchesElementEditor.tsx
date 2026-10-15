import { useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ColorPicker } from '../../../components/ui/ColorPicker';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Switch } from '../../../components/ui/Switch';
import type { SwatchesElement } from '../../websiteElements/types';
import { addSwatch, editSwatchColor, moveSwatch, removeSwatch, SWATCHES_DEFAULTS, SWATCHES_MAX_ITEMS, normalizeSwatchColor, resolveSwatchGeometry, editSwatchGeometry, SWATCH_CORNER_RADII, SWATCH_SIZES } from '../../websiteElements/swatches';
import { SPACING_PRESETS } from '../../websiteElements/spacing';
import { changeTextFontFamily, setTextFontWeight, type TextFontWeight } from '../../websiteElements/text';
import type { TemplateDesignLibrary } from '../../websiteCapabilities/types';
import { friendlyFontWeightOptions } from "../../websiteElements/textAppearance";
import { swatchCaptionTypographySchema } from "../../websiteElements/schemas";
import { FontPicker } from './FontPicker';
import { InspectorDisclosure, InspectorField, InspectorSection } from './InspectorPrimitives';

export function SwatchesElementEditor({ element, library, onChange }: { element: SwatchesElement; library: TemplateDesignLibrary; onChange: (element: SwatchesElement) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const appearance = { ...SWATCHES_DEFAULTS, ...element.appearance };
  const geometry = resolveSwatchGeometry(element.appearance);
  const typography = appearance.captionTypography ?? {};
  const setAppearance = (patch: Partial<NonNullable<SwatchesElement['appearance']>>) => onChange({ ...element, appearance: { ...element.appearance, ...patch } });
  const setTypography = (patch: Partial<typeof typography>) => setAppearance({ captionTypography: { ...typography, ...patch } });
  const options = (values: readonly string[]) => values.map(value => ({ value, label: value.endsWith('xl') ? value.toUpperCase() : value[0].toUpperCase() + value.slice(1) }));
  const focusRow = (id: string) => window.setTimeout(() => root.current?.querySelector<HTMLButtonElement>(`[data-swatch-row="${CSS.escape(id)}"] button`)?.focus(), 0);
  return <div ref={root} className="space-y-5 pt-5" data-swatches-element-editor>
    <InspectorSection title="Colors">
      {element.items.map((item, index) => <div key={item.id} data-swatch-row={item.id}>
        <InspectorDisclosure title={`Color ${index + 1}`} summary={`${item.label ? item.label + ' · ' : ''}${item.color}`} defaultOpen={index === 0}>
          <ColorPicker id={`swatch-${item.id}`} label={`Color ${index + 1}`} value={item.color} onChange={value => onChange(editSwatchColor(element, item.id, value))} />
          <SwatchLabel key={item.id} value={item.label ?? ''} index={index} onChange={label => onChange({ ...element, items: element.items.map(current => current.id === item.id ? { ...current, label: label || undefined } : current) })} />
          <div className="flex flex-wrap gap-2">
            {([-1, 1] as const).map(direction => <Button key={direction} type="button" size="sm" variant="secondary" aria-label={`Move color ${index + 1} ${direction === -1 ? 'up' : 'down'}`} disabled={direction === -1 ? index === 0 : index === element.items.length - 1} onClick={() => { onChange(moveSwatch(element, item.id, direction)); setAnnouncement(`Color moved to position ${index + direction + 1}.`); focusRow(item.id); }}>Move {direction === -1 ? 'Up' : 'Down'}</Button>)}
            <Button type="button" size="sm" variant="ghost" aria-label={`Remove color ${index + 1}`} disabled={element.items.length === 1} onClick={() => { onChange(removeSwatch(element, item.id)); setAnnouncement(`Color ${index + 1} removed.`); focusRow(element.items[index + 1]?.id ?? element.items[index - 1].id); }}>Remove</Button>
          </div>
        </InspectorDisclosure>
      </div>)}
      <Button type="button" size="sm" variant="secondary" disabled={element.items.length >= SWATCHES_MAX_ITEMS} onClick={() => { const next = addSwatch(element); onChange(next); setAnnouncement(`Color added at position ${next.items.length}.`); focusRow(next.items[next.items.length - 1].id); }}>Add Color</Button>
      <p className="text-xs text-foreground-muted">1–12 colors. At least one color is required.</p>
      <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
    </InspectorSection>
    <InspectorSection title="Swatches appearance">
      <InspectorField label="Shape"><Select aria-label="Swatches shape" value={geometry.shape} options={options(['circle', 'square', 'rectangle'])} onChange={shape => onChange(editSwatchGeometry(element, { shape: shape as 'circle' | 'square' | 'rectangle' }))} /></InspectorField>
      <InspectorField label="Corner Radius"><Select aria-label="Swatches corner radius" value={geometry.cornerRadius} disabled={geometry.shape === 'circle'} options={options(Object.keys(SWATCH_CORNER_RADII))} onChange={cornerRadius => onChange(editSwatchGeometry(element, { cornerRadius: cornerRadius as keyof typeof SWATCH_CORNER_RADII }))} />{geometry.shape === 'circle' && <p className="mt-1 text-xs text-foreground-muted">Circle is always fully rounded. Your radius is kept for Square or Rectangle.</p>}</InspectorField>
      <InspectorField label="Size"><Select aria-label="Swatches size" value={appearance.size} options={options(Object.keys(SWATCH_SIZES))} onChange={size => setAppearance({ size: size as typeof appearance.size })} /></InspectorField>
      <InspectorField label="Surface Style"><Select aria-label="Swatches surface style" value={appearance.surfaceStyle} options={options(['flat', 'raised', 'inset'])} onChange={surfaceStyle => setAppearance({ surfaceStyle: surfaceStyle as 'flat' | 'raised' | 'inset' })} /></InspectorField>
      <InspectorField label="Gap"><Select aria-label="Swatches gap" value={appearance.gap} options={options(SPACING_PRESETS)} onChange={gap => setAppearance({ gap: gap as typeof appearance.gap })} /></InspectorField>
      <InspectorField label="Alignment"><Select aria-label="Swatches alignment" value={appearance.alignment} options={options(['start', 'center', 'end'])} onChange={alignment => setAppearance({ alignment: alignment as typeof appearance.alignment })} /></InspectorField>
      <div className="flex items-center justify-between text-xs"><span>Show labels</span><Switch aria-label="Show swatch labels" checked={appearance.showLabels} onCheckedChange={showLabels => setAppearance({ showLabels })} /></div>
      <div className="flex items-center justify-between text-xs"><span>Show hex codes</span><Switch aria-label="Show swatch hex codes" checked={appearance.showHex} onCheckedChange={showHex => setAppearance({ showHex })} /></div>
    </InspectorSection>
    <InspectorSection title="Captions">
      <InspectorField label="Caption style"><Select aria-label="Caption style" value={appearance.captionStyle} options={options(['plain', 'soft'])} onChange={captionStyle => setAppearance({ captionStyle: captionStyle as 'plain' | 'soft' })} /></InspectorField>
      <InspectorField label="Text color"><ColorPicker label="Caption text color" value={appearance.captionTextColor} onChange={value => { const captionTextColor = normalizeSwatchColor(value); if (captionTextColor) setAppearance({ captionTextColor }); }} /></InspectorField>
      {appearance.captionStyle === 'soft' && <InspectorField label="Background color"><ColorPicker label="Caption background color" value={appearance.captionBackgroundColor} onChange={value => { const captionBackgroundColor = normalizeSwatchColor(value); if (captionBackgroundColor) setAppearance({ captionBackgroundColor }); }} /></InspectorField>}
      <InspectorField label="Font family"><FontPicker value={typography.fontFamilyId ?? ''} role="body" library={library} inheritedLabel="System font" onChange={fontFamilyId => setAppearance({ captionTypography: swatchCaptionTypographySchema.parse(changeTextFontFamily(typography, fontFamilyId || undefined)) })} /></InspectorField>
      <InspectorField label="Font weight"><Select aria-label="Caption font weight" value={String(typography.fontWeight ?? 400)} options={typography.fontFamilyId ? friendlyFontWeightOptions(typography.fontFamilyId) : [{ value: '400', label: 'Normal' }, { value: '600', label: 'Semibold' }, { value: '700', label: 'Bold' }]} onChange={weight => setAppearance({ captionTypography: swatchCaptionTypographySchema.parse(typography.fontFamilyId ? setTextFontWeight(typography, typography.fontFamilyId, Number(weight) as TextFontWeight) : { ...typography, fontWeight: Number(weight) as TextFontWeight }) })} /></InspectorField>
      <InspectorField label="Font size"><Select aria-label="Caption font size" value={typography.fontSize ?? 's'} options={options(['xs', 's', 'm'])} onChange={fontSize => setTypography({ fontSize: fontSize as 'xs' | 's' | 'm' })} /></InspectorField>
      <InspectorField label="Line height"><Select aria-label="Caption line height" value={typography.lineHeight ?? 'normal'} options={options(['tight', 'normal', 'relaxed'])} onChange={lineHeight => setTypography({ lineHeight: lineHeight as typeof typography.lineHeight })} /></InspectorField>
      <InspectorField label="Letter spacing"><Select aria-label="Caption letter spacing" value={typography.letterSpacing ?? 'normal'} options={options(['tight', 'normal', 'wide'])} onChange={letterSpacing => setTypography({ letterSpacing: letterSpacing as typeof typography.letterSpacing })} /></InspectorField>
    </InspectorSection>
  </div>;
}

function SwatchLabel({ value, index, onChange }: { value: string; index: number; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const invalid = Array.from(draft.trim()).length > 80 || /[<>]/.test(draft);
  return <InspectorField label="Optional label"><Input aria-label={`Color ${index + 1} label`} value={draft} aria-invalid={invalid} onChange={event => { const text = event.target.value; setDraft(text); if (Array.from(text.trim()).length <= 80 && !/[<>]/.test(text)) onChange(text.trim()); }} />{invalid && <p role="alert" className="text-xs text-danger">Use up to 80 characters without HTML. Your last valid label is kept.</p>}</InspectorField>;
}
