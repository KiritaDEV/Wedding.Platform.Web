import type { SwatchesElement } from './types';
import { createSemanticId } from '../websiteEditor/createSemanticId';

export const SWATCHES_MAX_ITEMS = 12;
export const SWATCH_SIZES = { small: 32, medium: 48, large: 64, xl: 96, '2xl': 128, '3xl': 160 } as const;
export const SWATCH_CORNER_RADII = { none: '0px', small: '8px', medium: '16px', large: '24px', full: '9999px' } as const;
type SwatchesAppearance = NonNullable<SwatchesElement['appearance']>;

export function resolveSwatchGeometry(appearance: SwatchesAppearance = {}) {
  return {
    shape: appearance.shape === 'roundedSquare' ? 'square' : appearance.shape ?? 'circle',
    cornerRadius: appearance.shape === 'roundedSquare' ? 'small' as const : appearance.cornerRadius ?? 'none',
  };
}

/** Only explicit geometry edits convert the legacy shape. Unrelated edits retain authored data. */
export function editSwatchGeometry(element: SwatchesElement, patch: { shape?: 'circle' | 'square' | 'rectangle'; cornerRadius?: keyof typeof SWATCH_CORNER_RADII }): SwatchesElement {
  const resolved = resolveSwatchGeometry(element.appearance);
  const appearance: SwatchesAppearance = { ...element.appearance, shape: patch.shape ?? resolved.shape, cornerRadius: patch.cornerRadius ?? resolved.cornerRadius };
  if (appearance.cornerRadius === 'none') delete appearance.cornerRadius;
  return { ...element, appearance };
}
export const SWATCHES_DEFAULTS = { shape: 'circle', size: 'medium', gap: 'm', surfaceStyle: 'flat', alignment: 'center', showLabels: false, showHex: false, captionStyle: 'soft', captionTextColor: '#111827', captionBackgroundColor: '#FFFFFF' } as const;

export function normalizeSwatchColor(value: string): string | undefined {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : undefined;
}

export function createSwatchesElement(editorName: string): SwatchesElement {
  return { id: createSemanticId('swatches'), type: 'swatches', editorName, appearance: { captionStyle: 'plain' }, items: ['#D1D5DB', '#9CA3AF', '#4B5563'].map(color => ({ id: createSemanticId('swatch'), color })) };
}

export function addSwatch(element: SwatchesElement): SwatchesElement {
  return element.items.length >= SWATCHES_MAX_ITEMS ? element : { ...element, items: [...element.items, { id: createSemanticId('swatch'), color: '#9CA3AF' }] };
}

export function editSwatchColor(element: SwatchesElement, id: string, value: string): SwatchesElement {
  const color = normalizeSwatchColor(value);
  return color ? { ...element, items: element.items.map(item => item.id === id ? { ...item, color } : item) } : element;
}

export function removeSwatch(element: SwatchesElement, id: string): SwatchesElement {
  return element.items.length <= 1 ? element : { ...element, items: element.items.filter(item => item.id !== id) };
}

export function moveSwatch(element: SwatchesElement, id: string, direction: -1 | 1): SwatchesElement {
  const from = element.items.findIndex(item => item.id === id), to = from + direction;
  if (from < 0 || to < 0 || to >= element.items.length) return element;
  const items = [...element.items];
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
  return { ...element, items };
}
