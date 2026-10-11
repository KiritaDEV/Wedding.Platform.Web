# Schedule Phase 3

## Placement appearance

All settings are optional and belong to `ScheduleElement.appearance`. Shared definitions and Days/Activities are unchanged. Empty layout-setting objects are removed during validation. Omitted fields resolve at render time; no database rewrite or version field is needed. Settings for inactive layouts are retained when switching layouts.

| Property | Allowed values | Default |
| --- | --- | --- |
| layout | timeline, list, cards | list |
| rowSpacing | existing none/xs/s/m/l/xl spacing presets | 1rem; modern editorial 1.25rem |
| timeline.arrangement | left, alternating | left |
| timeline.marker | dot, number, minimal | dot |
| timeline.markerColorId | known template/project color ID | resolved accent; currentColor fallback |
| timeline.lineColorId | known template/project color ID | currentColor |
| timeline.lineWidth | numeric 1, 2, 3 | 1px |
| list.timePosition | left, above | left |
| list.separation | none, line | line |
| cards.columns | single, grid | single |
| cards.gap / cards.padding | existing spacing presets | m / m |
| cards.backgroundColorId | known template/project color ID | transparent |
| cards.borderColorId | known template/project color ID | currentColor |
| cards.borderWidth | numeric 0, 1, 2, 3 | 1px |
| cards.radius | none, s, m, l | m (0.5rem) |
| cards.alignment | start, center, end | start |

Web/API reject unknown fields, invalid enum values, numeric strings, null settings and non-object JSON layout settings. Existing outer spacing and animation extractors remain responsible for those settings. No additional authored responsive properties or Schedule device selector is introduced. Custom Section compositions retain independent placement appearances. Duplication copies settings independently; resetting a device discards its custom composition through existing infrastructure.

## Layouts and containers

List preserves the familiar separated rows and English time formatting. Left-column time stacks below 28rem of actual Schedule width. Above-time remains stacked. Timeline uses a vertical rail and decorative dot, numbered or minimal markers. Alternating positions activate at 40rem of actual Schedule width; below that threshold all Activities align on the same side. DOM order stays authored order, including alternating layouts. Numbering restarts within each rendered Day.

Cards use a single column or auto-fit grid with minmax(min(100%,16rem),1fr). Gap, padding, background, border, radius and alignment are placement settings. Padding is capped relative to the container on very narrow Cards. All layouts constrain intrinsic widths and wrap long text. CSS container queries, rather than viewport/device category, determine fallback. Browsers without container-query support retain the stacked Timeline/List base styles. Existing Block motion/reduced-motion behavior remains outside the static layout renderer.

Day heading suppression, title/date/fallback headings, visibility and untitled filtering, multiline copy, locations, map validation and safe external links are unchanged. No Activity images or typography controls are added. All paths render resolved shared content; guest paths still read immutable snapshots.

## Inspector and publishing

Schedule Layout uses InspectorSection/InspectorField, Select and WebsiteColorSwatchControl. Only the selected layout's controls are shown. Custom-color previews are scoped to Section, placement and role; public rendering ignores transient preview state. Layout changes travel through the authored placement edit boundary, not the shared-definition editor. Existing Atomic Save Draft, revision/409 preservation and republishing remain the persistence boundaries.

Publication captures appearance alongside composition. The snapshot reader validates layout settings and their JSON object shape. Draft layout changes do not change stored published snapshots. No migration, endpoint, saved content conversion, snapshot rewrite, branch change or commit was performed.

## Files changed

Web:
- `src/features/websiteElements/scheduleAppearance.ts` (new): sparse schema, normalization and shared spacing values.
- `src/features/websiteElements/schemas.ts`: Schedule appearance integration.
- `src/features/websiteEditor/components/ScheduleLayoutEditor.tsx` (new): inspector controls and shared color picker.
- `src/pages/workspace/WebsitePage.tsx`: placement-only layout editing.
- `src/features/websiteRenderer/ScheduleElementRenderer.tsx`, `WebsiteLeafElementRenderer.tsx`: layout rendering and existing design context wiring.
- `src/features/websiteRenderer/scheduleLayouts.css` (new): container-aware layout styles.
- `src/features/websiteRenderer/scheduleLayouts.test.tsx`, `scheduleLayouts.browser.test.ts` (new): contracts, variants, actual Section/Group paths and measured browser geometry.
- `src/pages/workspace/WebsiteSharedContent.browser.test.ts`: layout save/reload, device isolation and conflict preservation.
- `docs/schedule-phase3.md` (new): contract and implementation map.

API:
- `app/Website/Elements/ScheduleAppearance.php` (new): strict placement appearance and JSON shape validation.
- `app/Website/Elements/WebsiteElementValidator.php`: reuse existing spacing/animation extraction around Schedule layout validation.
- `app/Website/WebsiteSectionContentValidator.php`: validate Schedule template/project color IDs, including nested Groups.
- `app/Http/Requests/UpdateWebsiteSectionContentRequest.php`: original JSON shape checks reused by aggregate Save Draft.
- `app/Website/Publishing/PublishedWebsiteSnapshotReader.php`: strict stored appearance shape validation.
- `tests/Unit/ScheduleAppearanceTest.php` (new), `tests/Feature/SharedContentTest.php`: parity, atomic save, color rejection, immutability and public/private snapshot presentation.
