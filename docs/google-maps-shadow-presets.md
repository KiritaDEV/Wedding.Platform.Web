# Google Maps shadow presets

Implemented 2026-10-14 as a focused extension of the existing Map Block.

## 1. Existing shadow system findings

The shared surface system is src/features/websiteRenderer/surfaceEffects.ts. Media and Gallery reuse SURFACE_SHADOWS and SURFACE_SHADOW_CSS. Group uses the same preset names and CSS values in its existing local map. Text/Divider effects additionally support text/drop-shadow colors and glow; those controls are not appropriate for a single surface-shadow setting.

Existing surface inspector conventions use a Select control with preset options inside an InspectorField/Field. GroupElementEditor and MediaElementEditor expose Shadow this way. Map reuses the shared Select and InspectorField in its existing Map appearance InspectorSection; it does not introduce the more expansive color/glow effects UI.

The Media renderer already combines borderRadius, overflow:hidden, and boxShadow on one visible surface. Map can directly use that pattern. No new CSS recipes, new shadow tokens, dependencies, or general layout refactor were needed.

## 2. Implemented canonical presets

| Saved value | Map UI label | Shared CSS |
| --- | --- | --- |
| none | None | none |
| soft | Subtle | 0 4px 16px rgb(0 0 0 / .1) |
| medium | Medium | 0 10px 28px rgb(0 0 0 / .16) |
| strong | Strong | 0 18px 45px rgb(0 0 0 / .24) |

These CSS values are documented here for reference, not redefined in Map. The renderer imports SURFACE_SHADOW_CSS and the schema/inspector import SURFACE_SHADOWS. The proposed user-facing Subtle option maps to the established canonical value soft; subtle is intentionally rejected as persisted input.

## 3. Renderer and clipping behavior

The shadow is applied to the actual visible Map container, which already owns maximum width, inline alignment margins, height, radius, and rounded iframe clipping. It therefore follows the selected width and radius instead of shadowing a full-width ancestor. No additional wrapper is necessary.

A container's overflow:hidden clips its descendant iframe content, not its own outer box-shadow decoration. This is the existing Media surface pattern. Map's iframe remains 100% of the visible container and the map remains in normal document flow with position:relative. Height, width caps, and Start/Center/End placement are unchanged.

Group child containment, OuterSpacingWrapper, WebsiteMotion, and WebsiteElementFrame do not add an intervening overflow clip in the tested Map cases. The browser test checks computed overflow/clip-path/paint-containment along this ancestor path. General Group policies were not changed.

Hero intentionally clips horizontal painting at its outer page edge via overflow-x:clip. A shadow at that boundary can be cropped by the existing Hero policy, just as other surface shadows can. Map does not widen the page, add automatic gutters, or override that Section policy. Use existing outer spacing or Group padding when a full shadow halo is wanted near a Section edge. Neighboring content can also paint over a shadow if the author leaves no spacing.

## 4. Inspector integration

Shadow appears immediately after Corner radius within Map appearance, near Maximum Width and Height. The shared Select defaults to None and offers None, Subtle, Medium, Strong. It uses the existing InspectorField label and section spacing.

No color, offset, spread, or blur controls were added. Changing shadow preserves the last validated URL even while the HTML textarea contains an invalid local draft. Edit-mode iframe pointer suppression and keyboard behavior are unchanged; management preview/public/private rendering remains interactive.

## 5. Web/API contracts and ownership

Optional property: appearance.shadow, restricted to none | soft | medium | strong.

Missing shadow resolves to none in the renderer and inspector. Creation and normalization remain sparse: no property is injected into older drafts or snapshots, and explicit valid presets are retained. MapElement types infer the new property from the Zod schema. PHP independently checks the JSON string type and enum, with filled validation to reject an empty string. Null, booleans, numeric values, arbitrary objects/lists, subtle, and unknown values are rejected.

The existing save/revision, duplication, publication, snapshot reader, and guest presentation paths already preserve validated Map appearance. No migration, table, snapshot version change, or new snapshot-specific branch is needed.

Shared is not Desktop. Device custom compositions clone an independent Map appearance and replace Shared for that device. No legacy nested responsive.shadow field or automatic viewport shadow change was introduced. Published appearance remains snapshot-only; draft changes require publication to reach guests.

## 6. Files changed for this enhancement

Web:

- src/features/websiteElements/schemas.ts
- src/features/websiteElements/googleMaps.test.ts
- src/features/websiteRenderer/MapElementRenderer.tsx
- src/features/websiteRenderer/MapElementRenderer.test.tsx
- src/features/websiteRenderer/googleMaps.browser.test.ts
- src/features/websiteEditor/components/MapElementEditor.tsx
- docs/google-maps-shadow-presets.md

API:

- app/Website/Elements/GoogleMaps.php
- app/Website/Elements/WebsiteElementValidator.php
- tests/Unit/GoogleMapsContractTest.php
- tests/Feature/GoogleMapsBlockTest.php

The existing uncommitted Map/width work and unrelated docs/swatches-block-architecture-audit.md were preserved. .env was not modified. No commit, push, deployment, migration, or dependency was added.

## 7. Verification results

- Focused Web: 7 files / 102 tests passed across Map URL/schema contracts, renderer, composition lifecycle/isolation, publishing, and real Chrome geometry.
- Chrome: 180 rendered cases retain the complete width/alignment/viewport/placement matrix, rotating omitted/all shadow presets, all radii, heights, Shared/custom ownership, both templates, editor, management-preview, public-site, and private-site rendering. It is not the exhaustive Cartesian product of every dimension.
- Every Chrome case JSON-round-trips through the published snapshot decoder before rendering. Cases without shadow exercise legacy snapshot compatibility. Measurements assert capped width, iframe fill, unchanged height/radius, alignment, Group/Hero containment, normal-flow positioning, and no horizontal scroll. Computed box-shadow is compared with a browser-normalized reference using the shared canonical CSS; all intervening ancestors up to Hero are checked for clipping. This establishes the CSS/geometry behavior; it is not a screenshot pixel-diff test of every shadow halo.
- The actual inspector Select defaults to None, displays Subtle, and persists soft while preserving the last valid URL through invalid HTML input.
- Web tests cover all canonical presets, invalid values, save serialization, duplication, independent custom appearance changes, and missing-shadow renderer defaults.
- API: 39 tests / 296 assertions passed across GoogleMaps, PublishedWebsiteSnapshotTest, PublishedWebsiteSnapshotPersistenceTest, and SnapshotGuestPresentationTest. New tests cover all presets and strict rejection, invalid draft writes without mutation, and reload/publication of each shadow with width presets for both guest audiences. Legacy no-shadow publication and snapshot isolation remain covered.
- Repository ESLint, TypeScript, production build, API Pint, and both diff whitespace checks passed. The build retains the existing large-chunk warning.

No unrelated failure was observed in these focused runs. Full repository suites were not run. Browser geometry uses the existing test-only frame-src 'none' policy to avoid dependence on Google network loading; production iframe attributes and CSP behavior were not changed.

## 8. Remaining manual checks

1. In the live builder compare the Map Shadow label and spacing with other appearance controls. Select each preset and reload the saved draft.
2. Visually inspect the soft/medium/strong halo at all radii and widths in Desktop/Tablet/Mobile, nested/narrow Groups, and a Hero with enough existing outer spacing. Confirm expected page-edge cropping where Hero clips horizontal paint.
3. Duplicate the Map and change only its shadow; customize a device composition and confirm Shared appearance remains independent.
4. Check actual Google panning/zoom/fullscreen in management preview and published public/private sites. Confirm Edit mode selects the Map.
5. Save a different shadow without publishing; guests must retain the frozen shadow until republishing. Confirm an older saved Map without shadow still shows None.
6. Inspect real deployment Network/Console for external Google/CSP restrictions. No real-device or production deployment check was performed.

KIRITA GOOGLE MAPS SHADOW PRESETS COMPLETE
