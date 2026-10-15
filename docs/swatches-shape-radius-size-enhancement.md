# Swatches: Shape, Corner Radius, and Size

Implemented 2026-10-15 in Web and API. This extends the existing Swatches MVP and caption enhancement. Those documents remain historical records; this report supersedes their three-size and shape-specific corner behavior.

## Canonical appearance contract

The inspector offers `circle`, `square`, and `rectangle`. Persisted `roundedSquare` remains accepted for compatibility. The optional `cornerRadius` accepts `none`, `small`, `medium`, `large`, or `full`. Size accepts `small`, `medium`, `large`, `xl`, `2xl`, or `3xl`.

```json
{
  "appearance": {
    "shape": "rectangle",
    "cornerRadius": "small",
    "size": "2xl",
    "captionStyle": "plain"
  }
}
```

Missing shape resolves to Circle, missing size to Medium, and missing canonical radius to None. New blocks retain the existing three neutral colors, hidden label/hex captions, and explicit Plain caption style. Shape/size/radius defaults are sparse; an explicit None geometry edit removes `cornerRadius`. Explicit valid radius values received by API are preserved. Circle ignores radius visually but retains authored state for a later shape switch.

Web strict Zod schemas and API allowlists accept the same enums and reject invalid strings, nulls, numeric values, object/list values, and unknown appearance fields. No nested responsive overrides are introduced. The existing opaque color, caption typography, Plain/Soft style, visibility, outer spacing, animation, collection bounds, ordering, and identity contracts remain unchanged.

## Legacy Rounded Square

`shape: "roundedSquare"` always resolves to a 1:1 square with the original **8px** radius. This remains true even if a radius field accompanies the legacy shape. Loading, selecting, rendering, validating, duplicating, saving unrelated fields, or decoding a snapshot does not convert it or inject a radius.

The inspector displays legacy data as **Square + Small**. There is no Rounded Square option for new authoring. Only explicit Shape or Corner Radius edits call the geometry conversion helper:

- Legacy → Rectangle produces `shape: "rectangle", cornerRadius: "small"`.
- Legacy → Circle retains Small in authored radius while rendering a full circle; switching back to Square restores Small.
- Legacy radius → Large produces `shape: "square", cornerRadius: "large"`.
- Legacy radius → None produces canonical Square with no radius property.

Unrelated Size, Gap, Alignment, caption, collection, and generic appearance edits continue to spread the original appearance rather than the resolved inspector geometry. No historical content/snapshot rewrite, migration, table, or schema-version bump is needed. Website schema version remains 5.

## Radius values

| Preset | CSS border-radius |
| --- | --- |
| None | `0px` |
| Small | `8px` |
| Medium | `16px` |
| Large | `24px` |
| Full | `9999px` |

The 0/8/16/24px scale matches existing Map corner presets; the large Full value follows the shared surface pill convention in `surfaceEffects.ts`. Map source/behavior is unchanged. A Swatches-specific mapping is necessary because the shared surface vocabulary is Square/Soft/Rounded/Pill and does not contain the approved five choices.

Circle always uses `50%`, regardless of stored radius. Canonical Square/Rectangle use the selected CSS radius; browser CSS rounding clamps large radii to available dimensions. Full produces maximally rounded geometry without changing the 1:1 or 2:1 bounding box. Legacy Rounded Square always uses exactly 8px.

## Size dimensions

| Preset | Circle / Square / legacy Rounded Square | Rectangle |
| --- | --- | --- |
| Small | 32 × 32px | 64 × 32px |
| Medium | 48 × 48px | 96 × 48px |
| Large | 64 × 64px | 128 × 64px |
| XL | 96 × 96px | 192 × 96px |
| 2XL | 128 × 128px | 256 × 128px |
| 3XL | 160 × 160px | 320 × 160px |

The original three dimensions are unchanged. Shape dimensions are internal presets, with no arbitrary pixel input or independent width/height controls. There is no device-based downsizing. If the allocated positive container width is smaller than a preset, `max-width:100%` and `aspect-ratio` reduce both dimensions proportionally. Narrow 3XL rectangles wrap as whole items and preserve 2:1 geometry.

## Inspector and rendering

Appearance controls are ordered Shape → Corner Radius → Size → existing Gap/Alignment and caption settings. Corner Radius is disabled for Circle, with explanatory text that Circle is always rounded and radius is retained for Square/Rectangle. Legacy data uses the resolved display values without a mount/change effect that persists them automatically.

The existing shared renderer serves editor, management preview, and public/private guest pages. It keeps palette fills literal, uses normal wrapping flow, retains item/caption association, and applies radius only to the visual shape. Plain/Soft caption colors/surfaces and typography remain unchanged. Shapes and visible captions remain decorative duplicates of each item's accessible label/color description; no guest controls are introduced.

Hero/Blank roots and supported two-level Groups retain their capability limits. Group padding/grid constraints, outer spacing, and Hero Space Between determine placement through existing wrappers. Shared is not Desktop; custom Desktop/Tablet/Mobile owners remain complete independent trees. The geometry edit helper updates only the element supplied from the resolved owner. Duplication still refreshes element/item IDs and copies authored geometry, including legacy values.

Readable containment requires positive usable width; excessive parent padding that consumes the entire content box remains outside supported geometry. No clipping or horizontal scrollbar is used as a layout workaround.

## Files changed for this enhancement

Web:

- `src/features/websiteElements/swatches.ts`: expanded sizes, radius mapping, resolved geometry, explicit conversion helper.
- `src/features/websiteElements/schemas.ts`: six sizes and optional radius enum.
- `src/features/websiteRenderer/SwatchesElementRenderer.tsx`: geometry/radius resolution with existing caption rendering.
- `src/features/websiteEditor/components/SwatchesElementEditor.tsx`: canonical choices, legacy display, disabled Circle radius, expanded Size selector.
- `src/features/websiteElements/swatches.test.tsx`: defaults, compatibility, explicit conversion, geometry, unrelated-edit preservation, and existing behavior regressions.
- `src/features/websiteElements/fixtures/swatches-contract.json`: mirrored accepted/rejected appearance combinations.
- `src/features/websiteRenderer/swatches.browser.test.ts`: six-size matrix, radius checks, legacy inspector interactions, and exact geometry grid.
- `docs/swatches-shape-radius-size-enhancement.md`: this report.

API:

- `app/Website/Elements/Swatches.php`: optional radius field and expanded size enum.
- `tests/Fixtures/swatches-contract.json`: identical Web/API contract cases.
- `tests/Unit/SwatchesContractTest.php`: legacy retention and copy behavior.
- `tests/Feature/SwatchesBlockTest.php`: both templates, all sizes/radii, save/reload, legacy snapshots, public/private publication, owner isolation, and invalid write rejection.

All pre-existing working-tree changes, including prior Swatches work and the unrelated API `ScheduleDaysTransitionTest.php` edit, are preserved. `.env`, Map code, templates, Sections, and prior reports were not modified. No dependencies, migrations, commits, pushes, or deployment.

## Automated verification

- **Focused Web regressions: 20 files / 665 tests passed.** Includes Swatches, Text/Divider/Countdown/Maps contracts/rendering, Groups/Structure, composition lifecycle/isolation, draft saving, font collection, and publishing/snapshot schemas. A final Swatches-only rerun after adding copy/owner geometry assertions passed **231 tests**.
- **Final Swatches Chrome test passed:** 1,728 rendered composition cases plus a separate **120-case exact shape × size × radius grid**, a 24px constrained Rectangle boundary, and real React inspector interactions. The matrix covers both templates, 320/768/1280 widths, 1/3/12 items, four persisted shapes (including legacy), six sizes, five radii/default omissions, root/Group/nested/narrow placement, Shared/custom ownership, editor/public modes, Plain/Soft captions, long labels, and label/hex visibility combinations.
- Geometry checks measure exact preset sides/widths, constrained aspect ratios, computed radius CSS including Circle and legacy 8px behavior, literal fills, caption surface/colors, character-range containment, item overlap, scroll widths, wrapping/height growth, Group containment, and Hero Space Between. Inspector interactions verify only three canonical choices, legacy Square + Small display, unrelated Size edit retention, explicit legacy conversion, Circle disable/retention, every radius and size choice, and the existing collection/caption controls.
- **Maps and Hero root-distribution Chrome regressions: 2 tests passed**, run serially.
- **Focused API regressions: 330 tests / 3,316 assertions passed.** Includes Swatches and mirrored enum combinations, Maps, Group/element/capability/owner validation, draft/revision persistence, Section lifecycle, snapshots/publication, public/private routes, and Divider contracts. Feature tests round-trip all sizes and radii across both templates, preserve/read legacy Rounded Square snapshots, verify draft isolation before publication, and retain independent custom Mobile geometry.
- **TypeScript/production build, repository ESLint, API Pint for the enhancement PHP files, mirrored-fixture equality, and Web/API whitespace checks passed.** Build retains the existing warning for a main bundle above 500kB.

One expanded browser rerun timed out while source/build checks were in flight. It did not produce a geometry assertion failure. The final stable-source run passed after reducing the browser's virtual-time budget from 20s to 10s; actual assertions and cases were retained. The initial build caught a new sparse-radius helper's optional-property typing issue; it was corrected and the build rerun passed. No unresolved failures remain in the focused checks. Full repository suites and live deployment testing were not performed.

## Remaining manual checks

1. Open an old Rounded Square block and published site; confirm 8px corners. Select it and edit Size/captions without changing Shape/Radius; verify the saved discriminator remains `roundedSquare`.
2. Explicitly change its radius and shape; verify canonical Square/Rectangle data. Switch Square → Circle → Square and confirm radius retention. Confirm only three Shape choices and clear Circle-disabled radius UX.
3. Inspect all six sizes/five radii on real mobile/tablet/desktop, including 3XL rectangles in narrow nested Groups, labels/codes, and Hero Space Between. Check zoom/text enlargement and actual caption contrast.
4. Duplicate/reorder, save/reload, and edit Shared/custom owners independently. Publish both templates; compare editor, management preview, public and private guests. Draft-only edits must leave guest output unchanged.
5. Check keyboard/screen-reader behavior and deployment Network/Console for errors or overflow. These real-account, real-device and assistive-technology checks were not performed by the automated harness.

KIRITA SWATCHES SHAPE RADIUS SIZE COMPLETE
