import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fixture from './fixtures/swatches-contract.json';
import { swatchesElementSchema, websiteElementSchema } from './schemas';
import { addSwatch, createSwatchesElement, editSwatchColor, moveSwatch, removeSwatch, SWATCHES_DEFAULTS, resolveSwatchGeometry, editSwatchGeometry, SWATCH_SIZES, SWATCH_CORNER_RADII } from './swatches';
import { createSectionElement, duplicateWebsiteElement } from '../websiteEditor/sectionChildFlow';
import { createCustomSectionComposition } from '../websiteEditor/compositionLifecycle';
import { sectionCompositionsSchema } from '../websiteEditor/schemas';
import { gallerySectionChildFlowSchema, rsvpSectionChildFlowSchema } from '../websiteEditor/sectionChildFlow';
import { groupAddKinds } from '../websiteEditor/components/sectionChildListHelpers';
import { rootAddElementItems } from '../websiteEditor/components/rootAddElementItems';
import { SwatchesElementRenderer } from '../websiteRenderer/SwatchesElementRenderer';
import { SWATCH_SURFACE_SHADOWS } from '../websiteRenderer/swatchesSurface';
import { SwatchesElementEditor } from '../websiteEditor/components/SwatchesElementEditor';
import { collectRequiredFontIds, platformFont } from '../websiteFonts/platformFonts';
import published from '../publicEventSite/fixtures/published-public-site.json';
import { normalizePublicRenderableWebsiteFromApi } from '../websiteEditor/schemas';
import type { CompositionGroup, SwatchesElement } from './types';

const make = () => createSwatchesElement('Swatches 1');
const flow = (element: SwatchesElement | CompositionGroup) => ({ elements: [element], order: [{ kind: 'element' as const, id: element.id }] });
it('keeps omitted surfaces Flat and copies explicit surfaces without altering geometry or other authoring', () => {
  expect(SWATCHES_DEFAULTS.surfaceStyle).toBe('flat');
  const element = make();
  expect(element.appearance).not.toHaveProperty('surfaceStyle');
  element.appearance = { shape: 'roundedSquare', size: '3xl', captionStyle: 'soft', showLabels: true };
  const legacy = swatchesElementSchema.parse(element);
  expect(legacy).toEqual(element);
  const flatHtml = renderToStaticMarkup(<SwatchesElementRenderer element={legacy} />);
  expect(flatHtml).toBe(renderToStaticMarkup(<SwatchesElementRenderer element={{ ...legacy, appearance: { ...legacy.appearance, surfaceStyle: 'flat' } }} />));
  expect(SWATCH_SURFACE_SHADOWS.flat).toBe('inset 0 0 0 1px rgb(0 0 0 / .2), 0 0 0 1px rgb(255 255 255 / .35)');
  for (const surfaceStyle of ['flat', 'raised', 'inset'] as const) {
    const candidate = swatchesElementSchema.parse({ ...element, appearance: { ...element.appearance, surfaceStyle } });
    const html = renderToStaticMarkup(<SwatchesElementRenderer element={candidate} />);
    expect(html).toContain(`box-shadow:${SWATCH_SURFACE_SHADOWS[surfaceStyle]}`);
    expect(html).toContain('border-radius:8px'); expect(html).toContain('background-color:#D1D5DB');
    expect(editSwatchColor(candidate, candidate.items[0].id, '#123456').appearance).toEqual(candidate.appearance);
    expect(moveSwatch(candidate, candidate.items[0].id, 1).appearance).toEqual(candidate.appearance);
    expect(editSwatchGeometry(candidate, { shape: 'rectangle' }).appearance!.surfaceStyle).toBe(surfaceStyle);
    const copy = duplicateWebsiteElement(flow(candidate), candidate);
    expect(copy.appearance).toEqual(candidate.appearance); expect(copy.items[0].id).not.toBe(candidate.items[0].id);
    const original = { semantic: {}, compositions: { shared: { childFlow: flow(candidate) } } };
    for (const viewport of ['desktop', 'tablet', 'mobile'] as const) {
      const custom = createCustomSectionComposition(original, viewport);
      const owned = custom.compositions.custom![viewport]!.childFlow.elements[0] as SwatchesElement;
      expect(owned.appearance).toEqual(candidate.appearance);
      owned.appearance!.surfaceStyle = surfaceStyle === 'raised' ? 'inset' : 'raised';
      expect(candidate.appearance!.surfaceStyle).toBe(surfaceStyle);
    }
  }
  expect(SWATCH_SURFACE_SHADOWS.raised).not.toBe(SWATCH_SURFACE_SHADOWS.inset);
});
it('preserves legacy geometry until explicitly edited and retains authored radius through Circle', () => {
  const element = make(); element.appearance = { shape: 'roundedSquare', captionStyle: 'soft' };
  expect(resolveSwatchGeometry(element.appearance)).toEqual({ shape: 'square', cornerRadius: 'small' });
  expect(swatchesElementSchema.parse(element).appearance).toEqual(element.appearance);
  expect(editSwatchColor(element, element.items[0].id, '#ABCDEF').appearance).toEqual(element.appearance);
  expect(moveSwatch(element, element.items[0].id, 1).appearance).toEqual(element.appearance);
  expect(editSwatchGeometry(element, { shape: 'rectangle' }).appearance).toMatchObject({ shape: 'rectangle', cornerRadius: 'small' });
  expect(editSwatchGeometry(element, { cornerRadius: 'large' }).appearance).toMatchObject({ shape: 'square', cornerRadius: 'large' });
  const circle = editSwatchGeometry(element, { shape: 'circle' });
  expect(circle.appearance).toMatchObject({ shape: 'circle', cornerRadius: 'small' });
  expect(editSwatchGeometry(circle, { shape: 'square' }).appearance).toMatchObject({ cornerRadius: 'small' });
  expect(editSwatchGeometry(element, { cornerRadius: 'none' }).appearance).toEqual({ shape: 'square', captionStyle: 'soft' });
  const library = { colors: [], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] };
  const html = renderToStaticMarkup(<SwatchesElementEditor element={element} library={library} onChange={() => { throw Error('Mount must not persist'); }} />);
  expect(html).not.toContain('Rounded Square'); expect(html).toContain('Swatches corner radius');
  expect(element.appearance).toEqual({ shape: 'roundedSquare', captionStyle: 'soft' });
  for (const [size, side] of Object.entries(SWATCH_SIZES)) for (const [cornerRadius, css] of Object.entries(SWATCH_CORNER_RADII)) for (const shape of ['circle', 'square', 'rectangle', 'roundedSquare']) {
    const parsed = swatchesElementSchema.parse({ ...element, appearance: { size, cornerRadius, shape } });
    const rendered = renderToStaticMarkup(<SwatchesElementRenderer element={parsed} />);
    expect(rendered).toContain(`width:${shape === 'rectangle' ? side * 2 : side}px;max-width:100%;aspect-ratio:${shape === 'rectangle' ? '2 / 1' : '1'}`);
    expect(rendered).toContain(`border-radius:${shape === 'circle' ? '50%' : shape === 'roundedSquare' ? '8px' : css}`);
  }
  expect(make().appearance).not.toHaveProperty('cornerRadius');
  const canonical = editSwatchGeometry(element, { shape: 'rectangle', cornerRadius: 'full' });
  canonical.appearance!.size = '3xl';
  const copy = duplicateWebsiteElement(flow(canonical), canonical);
  expect(copy.appearance).toEqual(canonical.appearance);
  expect(copy.items[0].id).not.toBe(canonical.items[0].id);
  const owner = { semantic: {}, compositions: { shared: { childFlow: flow(canonical) } } };
  const customized = createCustomSectionComposition(owner, 'mobile');
  const owned = customized.compositions.custom!.mobile!.childFlow.elements[0] as SwatchesElement;
  const changed = editSwatchGeometry(owned, { shape: 'square', cornerRadius: 'none' });
  changed.appearance!.size = 'xl';
  expect(canonical.appearance).toMatchObject({ shape: 'rectangle', cornerRadius: 'full', size: '3xl' });
  expect(owned.appearance).toEqual(canonical.appearance);
});
it('creates three neutral colors and registers root and nested Group insertion', () => {
  const created = createSectionElement(undefined, 'swatches');
  expect(swatchesElementSchema.parse(created).items.map(item => item.color)).toEqual(['#D1D5DB', '#9CA3AF', '#4B5563']);
  expect(created.editorName).toBe('Swatches 1');
  expect(swatchesElementSchema.parse(created).appearance).toEqual({ captionStyle: 'plain' });
  expect(SWATCHES_DEFAULTS).toMatchObject({ showLabels: false, showHex: false });
  expect(new Set(make().items.map(item => item.id)).size).toBe(3);
  expect(rootAddElementItems(['swatches'])).toEqual([{ type: 'swatches', label: 'Swatches' }]);
  expect(groupAddKinds(1)).toContain('swatches'); expect(groupAddKinds(2)).toContain('swatches');
  const group = (id: string, children: unknown[]) => ({ id, type: 'compositionGroup', editorName: 'Group', children });
  expect(websiteElementSchema.safeParse(group('g1', [group('g2', [created])])).success).toBe(true);
  expect(websiteElementSchema.safeParse(group('g1', [group('g2', [group('g3', [created])])])).success).toBe(false);
  const restricted = { ...flow(make()), order: [{ kind: 'specialized', key: 'content' }, ...flow(make()).order] };
  expect(gallerySectionChildFlowSchema.safeParse(restricted).success).toBe(false);
  expect(rsvpSectionChildFlowSchema.safeParse(restricted).success).toBe(false);
});
it('preserves legacy soft captions and renders explicit plain/soft with literal colors', () => {
  const element = make();
  element.items = [{ id: 'a', color: '#FFFFFF', label: 'Cloud' }];
  element.appearance = { showLabels: true, showHex: true };
  const legacy = swatchesElementSchema.parse(element);
  expect(legacy.appearance).not.toHaveProperty('captionStyle');
  const oldHtml = renderToStaticMarkup(<SwatchesElementRenderer element={legacy} />);
  expect(oldHtml).toContain('background-color:#FFFFFF');
  expect(oldHtml).toContain('color:#111827');
  for (const captionStyle of ['plain', 'soft'] as const) {
    const parsed = swatchesElementSchema.parse({ ...element, appearance: { ...element.appearance, captionStyle, captionTextColor: '#aabbcc', captionBackgroundColor: '#ddeeff', shape: 'rectangle' } });
    expect(parsed.appearance).toMatchObject({ captionTextColor: '#AABBCC', captionBackgroundColor: '#DDEEFF' });
    const html = renderToStaticMarkup(<SwatchesElementRenderer element={parsed} />);
    expect(html).toContain('color:#AABBCC');
    expect(html.includes('background-color:#DDEEFF')).toBe(captionStyle === 'soft');
    expect(html).toContain('width:96px;max-width:100%;aspect-ratio:2 / 1');
    expect(html).not.toMatch(/<button|<input|tabindex/);
    const reordered = moveSwatch({ ...parsed, items: [...parsed.items, { id: 'b', color: '#000000', label: 'Ink' }] }, 'a', 1);
    expect(reordered.items[1]).toEqual(parsed.items[0]); expect(reordered.appearance).toEqual(parsed.appearance);
    const original = { semantic: {}, compositions: { shared: { childFlow: flow(parsed) } } };
    const custom = createCustomSectionComposition(original, 'mobile');
    const owned = custom.compositions.custom!.mobile!.childFlow.elements[0] as SwatchesElement;
    owned.appearance!.captionStyle = captionStyle === 'soft' ? 'plain' : 'soft'; owned.appearance!.captionTextColor = '#000000';
    expect(parsed.appearance!.captionStyle).toBe(captionStyle); expect(parsed.appearance!.captionTextColor).toBe('#AABBCC');
  }
  for (const showLabels of [false, true]) for (const showHex of [false, true]) {
    const html = renderToStaticMarkup(<SwatchesElementRenderer element={{ ...element, appearance: { shape: 'rectangle', showLabels, showHex, captionStyle: 'plain' } }} />);
    expect(html.includes('data-swatch-caption')).toBe(showLabels || showHex);
    expect(html).toContain('Cloud, #FFFFFF');
  }
});
it.each(fixture.validColors)('normalizes opaque color %s and preserves duplicate values', color => {
  const element = make(); element.items = [{ id: 'a', color }, { id: 'b', color }];
  expect(swatchesElementSchema.parse(element).items.map(item => item.color)).toEqual([color.toUpperCase(), color.toUpperCase()]);
});
it.each(fixture.invalidColors)('rejects invalid color %j', color => {
  expect(swatchesElementSchema.safeParse({ ...make(), items: [{ id: 'a', color }] }).success).toBe(false);
});
it.each(fixture.validAppearance)('accepts supported appearance %j', appearance => {
  expect(swatchesElementSchema.safeParse({ ...make(), appearance }).success).toBe(true);
});
it.each(fixture.invalidAppearance)('rejects unsupported appearance %j', appearance => {
  expect(swatchesElementSchema.safeParse({ ...make(), appearance }).success).toBe(false);
});
it('enforces bounds, item shapes, normalized IDs and optional Unicode labels', () => {
  const element = make();
  for (const items of [[], Array.from({ length: 13 }, (_, i) => ({ id: String(i), color: '#000000' })), [{ id: 'a', color: '#000000' }, { id: ' a ', color: '#FFFFFF' }], [{ id: element.id, color: '#FFFFFF' }], [{ id: 'a', color: '#000000', unknown: true }], [{ id: ' ', color: '#000000' }]]) expect(swatchesElementSchema.safeParse({ ...element, items }).success).toBe(false);
  for (const label of [null, '<b>red</b>', '😀'.repeat(81)]) expect(swatchesElementSchema.safeParse({ ...element, items: [{ id: 'a', color: '#000000', label }] }).success).toBe(false);
  expect(swatchesElementSchema.parse({ ...element, items: [{ id: ' a ', color: '#aabbcc', label: '  Slate  ' }] }).items[0]).toEqual({ id: 'a', color: '#AABBCC', label: 'Slate' });
  expect(swatchesElementSchema.parse({ ...element, items: [{ id: 'a', color: '#000000', label: '😀'.repeat(80) }] }).items[0].label).toHaveLength(160);
});
it('adds, edits, removes and reorders stable IDs without corrupting valid colors', () => {
  let element = make(); const ids = element.items.map(item => item.id);
  expect(editSwatchColor(element, ids[0], 'red')).toBe(element);
  element = editSwatchColor(element, ids[0], '#abcdef'); expect(element.items[0]).toEqual({ id: ids[0], color: '#ABCDEF' });
  element = moveSwatch(element, ids[0], 1); expect(element.items.map(item => item.id)).toEqual([ids[1], ids[0], ids[2]]);
  expect(moveSwatch(element, ids[1], -1)).toBe(element);
  for (let i = 0; i < 20; i++) element = addSwatch(element);
  expect(element.items).toHaveLength(12); expect(addSwatch(element)).toBe(element);
  for (const item of [...element.items]) element = removeSwatch(element, item.id);
  expect(element.items).toHaveLength(1); expect(removeSwatch(element, element.items[0].id)).toBe(element);
});
it('refreshes all copy/custom IDs and isolates complete compositions', () => {
  const element = make(); element.appearance = { showLabels: true, captionTypography: { fontFamilyId: 'inter' } };
  const group: CompositionGroup = { id: 'g', type: 'compositionGroup', editorName: 'Group', children: [element] };
  const copy = duplicateWebsiteElement(flow(group), group);
  expect(copy.id).not.toBe(group.id);
  const palette = copy.children[0] as SwatchesElement;
  expect(palette.items.map(item => item.color)).toEqual(element.items.map(item => item.color));
  expect(palette.items.every(item => !element.items.some(original => original.id === item.id))).toBe(true);
  const original = { semantic: {}, compositions: { shared: { childFlow: flow(group) } } };
  const custom = createCustomSectionComposition(original, 'mobile');
  expect(sectionCompositionsSchema.safeParse(custom.compositions).success).toBe(true);
  const owned = (custom.compositions.custom!.mobile!.childFlow.elements[0] as CompositionGroup).children[0] as SwatchesElement;
  owned.items[0].color = '#000000'; owned.appearance!.showLabels = false;
  expect(element.items[0].color).toBe('#D1D5DB'); expect(element.appearance.showLabels).toBe(true);
  const invalid = structuredClone(custom.compositions); invalid.custom!.mobile!.childFlow = original.compositions.shared.childFlow;
  expect(sectionCompositionsSchema.safeParse(invalid).success).toBe(false);
});
it('uses noninteractive accessible list semantics and collects nested caption fonts', () => {
  const element = make(); element.items[0].label = 'Cloud';
  let html = renderToStaticMarkup(<SwatchesElementRenderer element={element} />);
  expect(html).toContain('aria-label="Event color palette"'); expect(html).toContain('Cloud, #D1D5DB'); expect(html).not.toContain('data-swatch-caption');
  expect(html).not.toMatch(/<button|<input|tabindex|role="radio"/);
  element.appearance = { showLabels: true, showHex: true, captionTypography: { fontFamilyId: 'inter' } };
  html = renderToStaticMarkup(<SwatchesElementRenderer element={element} />); expect(html).toContain('data-swatch-caption'); expect(html).toContain('background-color:#FFFFFF');
  const site = normalizePublicRenderableWebsiteFromApi(structuredClone(published.data.website));
  site.sections = [site.sections[0]]; site.sections[0].content = { semantic: {}, compositions: { shared: { childFlow: flow({ id: 'g', type: 'compositionGroup', editorName: 'Group', children: [element] }) } } };
  expect(collectRequiredFontIds(site)).toContain('inter');
  const library = { colors: [], fontFamilies: [{ ...platformFont('inter')!, allowedRoles: ['heading', 'body'] as Array<'heading' | 'body'> }], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] };
  const inspector = renderToStaticMarkup(<SwatchesElementEditor element={{ ...element, items: [element.items[0]] }} library={library} onChange={() => {}} />);
  expect(inspector).toMatch(/<button(?=[^>]*aria-label="Remove color 1")(?=[^>]*disabled="")/); expect(inspector).toContain('Add Color'); expect(inspector).not.toContain('Use Template');
});
