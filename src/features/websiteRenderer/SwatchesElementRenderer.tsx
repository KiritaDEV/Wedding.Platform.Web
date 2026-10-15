import { SWATCH_SURFACE_SHADOWS } from './swatchesSurface';
import type { SwatchesElement } from '../websiteElements/types';
import { SWATCHES_DEFAULTS, SWATCH_SIZES, SWATCH_CORNER_RADII, resolveSwatchGeometry } from '../websiteElements/swatches';
import { SPACING_PRESET_CSS } from '../websiteElements/spacing';
import { platformFontStack } from '../websiteFonts/platformFonts';
import { elementFontSizes, elementLetterSpacings, elementLineHeights } from './elementTypography';
import { resolveElementInlineAlignment } from './elementInlineAlignment';

export function SwatchesElementRenderer({ element }: { element: SwatchesElement }) {
  const appearance = { ...SWATCHES_DEFAULTS, ...element.appearance };
  const typography = appearance.captionTypography ?? {};
  const size = SWATCH_SIZES[appearance.size];
  const geometry = resolveSwatchGeometry(appearance);
  const rectangle = geometry.shape === "rectangle";
  const shapeWidth = rectangle ? size * 2 : size;
  const soft = appearance.captionStyle === "soft";
  return <ul aria-label="Event color palette" data-website-element="swatches" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: resolveElementInlineAlignment({ start: 'flex-start', center: 'center', end: 'flex-end' }[appearance.alignment]), gap: SPACING_PRESET_CSS[appearance.gap], width: '100%', maxWidth: '100%', minWidth: 0, padding: 0, margin: 0, listStyle: 'none' }}>
    {element.items.map(item => {
      const label = appearance.showLabels ? item.label : undefined;
      const code = appearance.showHex ? item.color : undefined;
      return <li key={item.id} data-swatch-item={item.id} style={{ flex: '0 1 auto', width: `${Math.max(shapeWidth, label || code ? 96 : shapeWidth)}px`, maxWidth: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <span className="sr-only">{item.label ? `${item.label}, ${item.color}` : item.color}</span>
        <span aria-hidden="true" data-swatch-shape style={{ display: 'block', flexShrink: 0, width: `${shapeWidth}px`, maxWidth: '100%', aspectRatio: rectangle ? '2 / 1' : '1', boxSizing: 'border-box', backgroundColor: item.color, borderRadius: geometry.shape === 'circle' ? '50%' : SWATCH_CORNER_RADII[geometry.cornerRadius], boxShadow: SWATCH_SURFACE_SHADOWS[appearance.surfaceStyle] }} />
        {(label || code) && <span aria-hidden="true" data-swatch-caption style={{ display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box', padding: soft ? '0.25rem' : 0, borderRadius: soft ? '4px' : 0, backgroundColor: soft ? appearance.captionBackgroundColor : undefined, color: appearance.captionTextColor, textAlign: 'center', overflowWrap: 'anywhere', fontFamily: typography.fontFamilyId ? platformFontStack(typography.fontFamilyId) : 'system-ui, sans-serif', fontSize: elementFontSizes[typography.fontSize ?? 's'], fontWeight: typography.fontWeight ?? 400, lineHeight: elementLineHeights[typography.lineHeight ?? 'normal'], letterSpacing: elementLetterSpacings[typography.letterSpacing ?? 'normal'] }}>
          {label && <span style={{ display: 'block' }}>{label}</span>}
          {code && <span style={{ display: 'block' }}>{code}</span>}
        </span>}
      </li>;
    })}
  </ul>;
}
