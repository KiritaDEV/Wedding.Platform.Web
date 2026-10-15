# Swatches Block MVP

Implemented 2026-10-14 in Wedding.Platform.Web and Wedding.Platform.API. This implements the approved product request; three initial colors and hidden captions supersede the earlier audit's proposed defaults.

## 1. Data contract and defaults

Swatches is the generic leaf type `swatches`, displayed as **Swatches** in Structure. Insert it at Hero/Blank roots or inside valid Groups. Gallery/RSVP keep their narrower capability restrictions. No new Section, template, table, migration, endpoint, shared-content definition, dependency, or project-color record is introduced.

```json
{
  "id": "swatches-identity",
  "type": "swatches",
  "editorName": "Swatches 1",
  "items": [
    { "id": "swatch-1", "color": "#D1D5DB" },
    { "id": "swatch-2", "color": "#9CA3AF" },
    { "id": "swatch-3", "color": "#4B5563", "label": "Slate" }
  ]
}
```

`items` is an ordered list with 1–12 entries. Each entry contains a stable nonblank ID, a literal opaque six-digit hex color, and an optional plain-text label. Duplicate colors are allowed; duplicate identities are not. Labels trim surrounding whitespace, allow up to 80 Unicode code points, reject angle brackets, and omit blank values. IDs follow the existing trimmed nonblank/max-255 contract, not an exclusively ULID contract.

Optional appearance:

| Property | Values | Resolved default |
| --- | --- | --- |
| `shape` | `circle`, `roundedSquare`, `square` | circle |
| `size` | `small`, `medium`, `large` | medium |
| `gap` | existing `none`, `xs`, `s`, `m`, `l`, `xl` | m; applies to rows and columns |
| `alignment` | `start`, `center`, `end` | center, respecting existing Group inline alignment boundaries |
| `showLabels` | boolean | false |
| `showHex` | boolean | false |
| `captionTypography` | `fontFamilyId`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` | system font, s, 400, normal, normal |
| `outerSpacing`, `animation` | existing generic contracts | unchanged generic defaults |

Resolved shape dimensions are **32/48/64 px** for Small/Medium/Large, using the existing compact 8px size scale. Rounded Square has an 8px radius; Circle uses 50%; Square uses zero. Dimensions are internal presets, not authored pixels. A shape shrinks uniformly if a positive container is narrower than its preset. Caption sizes are the existing `xs/s/m` values: 12/14/16px at a 16px root font. Weights are 400/600/700, restricted by the chosen registered font. No caption theme/color references or nested `responsive` fields are accepted.

## 2. Editor behavior

The inspector uses existing Inspector sections/disclosures, ColorPicker, Input, Select, Switch, Button, FontPicker, and Text font-family/weight helpers. Each color disclosure exposes direct color editing, an optional label, Move Up/Down, and Remove. Add Color appends a fresh independently identified neutral color. The twelfth item disables Add; the last item disables Remove. Boundary moves are disabled.

Color editing commits valid values immediately. Temporarily incomplete/invalid hex text stays in the picker's local input and cannot replace the last valid color. The picker reverts invalid text on blur. Invalid labels show an error and preserve the last valid label. Appearance edits do not read uncommitted color text. There is no project-color API call, Theme reference, global palette editor, or guest-side editing.

Rows use item IDs as React keys. Reordering announces the new position and restores focus to the moved row; adding/removing focuses a sensible row. Drag-and-drop is not required. Existing block rename, selection, visibility, outer spacing, and motion editors are available through the usual Structure/inspector paths.

## 3. Rendering and responsive ownership

One `SwatchesElementRenderer` is dispatched by `WebsiteLeafElementRenderer` for Edit, management preview, and both guest audiences. It emits a container-width semantic list with natural horizontal flex wrapping. Each item owns its shape and captions. Caption-bearing items have a modest internal 96px target width bounded by available space; there is no authored column count or separate layout engine.

Shapes keep equal sides/aspect ratio. Labels and codes sit below the fill and wrap within their item. Captions use dark `#111827` text on white `#FFFFFF`, avoiding dependence on an arbitrary Hero image or palette color. Shapes have a subtle edge boundary for near-white/near-black fills. The actual stored color remains the fill, without opacity or theme resolution.

The palette is a named `<ul>`; each `<li>` has one screen-reader text description containing the label when supplied and always its color value. Shapes and visual caption duplicates are aria-hidden. Hidden visual captions do not remove accessible descriptions. Guests receive no buttons, inputs, links, radios, or tab stops. Existing reduced-motion handling remains in the generic animation wrapper.

The existing full-width frame, outer spacing, motion, Group containment, and Hero root flow remain responsible for placement. Group grid tracks/padding reduce actual available width. Swatches adds natural vertical height, including under Hero Space Between; it does not use absolute positioning, fixed height, horizontal scrolling, or clipping to simulate containment.

Wrapping depends on allocated CSS width. Existing device detection/editor initial experience is unchanged. Owner resolution happens before editing: Shared is not Desktop. A custom Desktop/Tablet/Mobile composition clones a complete independent tree with refreshed identities; collection and appearance edits affect only the resolved owner. Mobile without a custom composition edits Shared. Removing custom Mobile returns current Shared. No nested appearance override mechanism is added.

Zero usable width after excessive parent padding cannot display readable captions or a visible shape. Supported containment assumes positive space. The browser matrix covers narrow nested tracks, and a separate 24px boundary checks uniform shape shrink. No general Group layout changes were made to accommodate impossible padding combinations.

## 4. Web/API validation parity

Mirrored `swatches-contract.json` fixtures exercise uppercase normalization, duplicate colors, invalid colors, strict appearance fields, and font tuples. Both sides accept only `#RRGGBB` (case-insensitive input; uppercase storage), rejecting shorthand, alpha, CSS functions/names/variables, gradients, whitespace, and nonstrings. Unknown element/item/appearance/typography fields are rejected. IDs remain unique across a Section's Shared/custom trees, including nested item IDs and collisions with element IDs.

Web uses strict Zod object/list schemas and a bounded subset of the canonical Text typography schema. API Swatches rules reuse existing typography/font tuple validation, outer spacing, and animation extraction/restoration. Caption font references are checked against the supplied Template font capability in both applications. Literal palette colors never pass through Theme/project color resolution or deduplication.

Raw request and snapshot checks preserve object-versus-list distinctions before PHP associative decoding erases them. Empty appearance and caption objects are valid and serialize as objects; arrays in their place are rejected through both content and draft-save boundaries. Null values and coerced booleans/numeric strings are rejected. Empty enum strings are also explicitly rejected.

## 5. Duplication and identity handling

Add generates a fresh item ID. Edit and Move Up/Down preserve IDs; array order is the sole item ordering contract. Block/Group duplication and custom-owner creation refresh Swatches element and item IDs through the existing recursive Web identity path. API Section/composition duplication already regenerates generic `items`; its uniqueness traversal now also visits Swatches entries. Colors, labels, ordering, and appearance are copied without linking palettes together.

Existing root/Group count limits and maximum two Group levels remain intact. Root block order still uses `childFlow.order`; palette entries do not create new root references.

## 6. Publishing and compatibility

Existing JSON Section storage, revision-controlled draft saves, normalization/resources, snapshot builder/reader, and public/private presentation carry the new leaf. Website schema version remains **5**. No previously stored content is rewritten or given a palette automatically.

Tests save/reload normalized nested Swatches and independent Mobile values, publish them, and read identical palettes through public and private invitation APIs. Subsequent valid draft edits leave published snapshots and both guest outputs unchanged. Malformed snapshot settings fail decoding. Empty appearance/caption objects round-trip. A Swatches-free snapshot with the new capability entries removed decodes as a pre-addition descriptor fixture for each template; existing published snapshot regressions also pass.

Caption font collection traverses nested Groups and all persisted owners. Generic hidden-element filtering and media handling remain unchanged; Swatches references no assets. Multiple blocks carry independent local items. Release API/Web support together before exposing creation to clients; old strict clients cannot be assumed to understand a new discriminator. No production deployment was performed.

## 7. Files changed

Web:

- `src/features/websiteElements/{constants.ts,blockIdentity.ts,types.ts,schemas.ts,swatches.ts,swatches.test.tsx,fixtures/swatches-contract.json}`
- `src/features/websiteCapabilities/schemas.ts`
- `src/features/websiteEditor/{sectionChildFlow.ts,schemas.ts}`
- `src/features/websiteEditor/components/{rootAddElementItems.ts,sectionChildListHelpers.ts,SectionChildList.tsx,SectionChildList.test.tsx,SwatchesElementEditor.tsx}`
- `src/features/websiteFonts/platformFonts.ts`
- `src/features/websiteRenderer/{WebsiteLeafElementRenderer.tsx,WebsiteElementFrame.tsx,SwatchesElementRenderer.tsx,swatches.browser.test.ts}`
- `src/pages/workspace/WebsitePage.tsx`
- `docs/swatches-block-mvp.md`

API:

- `app/Website/Elements/{WebsiteElementType.php,WebsiteElementValidator.php,CompositionGroupValidator.php,DividerJsonShape.php,Swatches.php}`
- `app/Website/Capabilities/WebsiteCapabilityResolver.php`
- `app/Website/WebsiteSectionContentValidator.php`
- `app/Http/Requests/UpdateWebsiteSectionContentRequest.php`
- `app/Website/Publishing/PublishedWebsiteSnapshotReader.php`
- `tests/{Fixtures/swatches-contract.json,Unit/SwatchesContractTest.php,Feature/SwatchesBlockTest.php}`

The pre-existing API change in `tests/Unit/ScheduleDaysTransitionTest.php` was preserved and excluded from formatting. `.env`, Google Maps behavior/source, templates, existing audit, and Maps documentation were not changed. No commit, push, migration, dependency installation, or deployment occurred.

## 8. Verification results

- Focused Web regression: **20 files / 479 tests passed** for Swatches/Maps/Text/Divider/Countdown contracts, Group/Structure operations, owner lifecycle/isolation, draft saving, font loading, and publication/snapshot decoding.
- Swatches actual Chrome test: **648 rendered cases passed**, plus real React inspector input/action checks and the 24px shape boundary. Matrix: both templates; 320/768/1280 widths; 1/3/12 colors; every shape/size; root/Group/nested/narrow placements; editor/public; Shared/custom; label/code captions, long labels, and Hero Space Between. It measures rectangles, shape aspect/radius/color, text character ranges, item overlap, Group/Hero containment, scroll widths, and natural height growth.
- Existing Maps, Countdown responsive, and Hero root-distribution Chrome regressions: **3 tests passed**, run serially.
- Focused API regression: **326 tests / 2,903 assertions passed**, including Swatches, Maps, element/Group/capability contracts, responsive compositions, draft/revision persistence, Section lifecycle, snapshots, publication, public/private guest routes, and Divider contracts.
- Final Swatches-only API rerun after tightening nested animation JSON shape checks: **4 tests / 140 assertions passed**; Pint passed again.
- TypeScript, repository ESLint, production build, API Pint on changed files, and Web/API diff whitespace checks passed. Production build retains the existing warning for a main bundle exceeding 500kB.

The first expanded Web run found a stale Group-choice expectation that already omitted the existing Map type; it was updated to include Map and Swatches. No unresolved focused test failures remain. Early new-test failures were corrected: capability descriptors versus authored snapshot leaves, invalid fixture fields/label length, missing application CSS in the browser harness, and empty-object serialization. Full repository suites were not run; focused receipts do not claim full-suite or live deployment verification.

## 9. Remaining manual smoke tests

1. In the actual builder, insert multiple independent Swatches at Hero/Blank roots and in both permitted Group levels. Verify selecting, renaming, hiding, duplicating, outer spacing, and entrance animation.
2. Keyboard-only: change colors and labels, temporarily enter invalid hex, change appearance, move/remove/add rows, and check focus/announcements and both collection bounds. Screen-reader-check the editor picker and public palette announcements.
3. Inspect every shape/size/gap/alignment and caption option against light/dark Hero backgrounds. Check zoom/text enlargement, loaded caption fonts, narrow Groups, and Hero Space Between on a real mobile device.
4. Save/reload, create custom Mobile/Desktop, edit each owner's palette, and remove a custom owner. Verify the selected owner's isolation and detected-device initial editor experience.
5. Open management preview, publish both templates, then inspect public/private guest sites. Save a different draft color without publication and confirm guests retain the old palette; publish and verify the update.
6. Inspect deployment DevTools Network/Console: no project-color mutation from Swatches authoring, missing font resources, hydration errors, or unexpected horizontal scroll. These real account/device/deployment checks were not performed in this implementation run.

## 10. Deferred enhancements

Alpha/gradients, per-item typography/effects/animation, global semantic palettes, Theme/project color references, interactive guest color actions, drag ordering, separate row/column-gap controls, custom dimensions/columns/breakpoints, and enabling Swatches in restricted Gallery/RSVP slots remain out of scope.

KIRITA SWATCHES BLOCK MVP COMPLETE
