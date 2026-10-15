# Swatches surface styles

Implemented 2026-10-15 in Web and API. This extends the existing Swatches renderer/inspector contract without changing its composition architecture or the earlier caption, shape, radius, and size behavior.

## 1. Contract

Optional `appearance.surfaceStyle` accepts only:

| Value | Rendering |
| --- | --- |
| `flat` | Original appearance, with no added directional bevel |
| `raised` | Upper-left inner highlight and lower-right inner shadow |
| `inset` | Upper-left inner shadow and lower-right inner highlight |

```json
{
  "appearance": {
    "shape": "rectangle",
    "cornerRadius": "full",
    "size": "xl",
    "surfaceStyle": "raised"
  }
}
```

Missing values resolve to **Flat**. Creation remains sparse and does not need to persist the default. Explicit valid values are preserved, including explicit Flat. Both Web and API reject unknown styles, incorrect casing, empty strings, null, numbers, booleans, objects/lists, and unsafe strings. Existing strict unknown-field handling remains authoritative. There are no intensity, color, direction, thickness, gradient, or arbitrary CSS controls.

## 2. Rendering implementation

`swatchesSurface.ts` contains a small Swatches-specific shadow lookup used by the existing shape span. There is no new surface/layout engine, child overlay, image asset, or renderer dispatch path.

**Flat retains the original shadow string exactly:**

```css
inset 0 0 0 1px rgb(0 0 0 / .2),
0 0 0 1px rgb(255 255 255 / .35)
```

That is the existing dark inset boundary and faint light outer edge. Flat adds no bevel treatment.

**Raised prepends:**

```css
inset 2px 2px 3px rgb(255 255 255 / .55),
inset -2px -2px 3px rgb(0 0 0 / .28)
```

**Inset prepends:**

```css
inset 2px 2px 3px rgb(0 0 0 / .32),
inset -2px -2px 3px rgb(255 255 255 / .45)
```

Lighting is fixed from the upper left. Raised and Inset reverse the light/dark edge orientation. Only these inner edges change; no dramatic external drop shadow is added. The existing Flat boundary remains in all three styles.

The `backgroundColor` remains the exact authored opaque hex; no background image/gradient, opacity, filter, or modified stored color is used. Edge pixels are intentionally shaded to create depth while the interior remains the base color. Automated screenshot comparisons verify exact center pixels on white, black, saturated red, and neutral gray.

## 3. Compatibility and publishing

Older drafts and published snapshots with no field continue resolving to the same Flat treatment. Schemas/API validation do not insert a default or rewrite content. Website schema version remains 5; no table, migration, dependency, Theme/project-color integration, or historical snapshot rewrite is introduced.

The existing draft save/reload, snapshot builder/reader, and public/private presentation carry this optional primitive. A draft-only surface change remains invisible to already published guests until publication. Duplication and custom-owner cloning copy the authored appearance while regenerating owned identities as before. Shared is not Desktop; Desktop/Tablet/Mobile custom compositions retain independent surface settings.

API and Web support should be released together before authoring the new field because older strict clients/validators cannot be assumed to accept it. This implementation did not deploy anything.

## 4. Inspector

One **Surface Style** Select appears immediately after Size, near Shape and Corner Radius. It displays Flat/Raised/Inset using existing inspector and Select conventions. A missing field displays Flat without a mount-time write. Selecting a style updates only the resolved element's appearance through the existing change path; unrelated changes preserve it.

No new user-facing controls were added beyond this selector. Changing Surface Style spreads authored appearance rather than resolved geometry, so legacy `roundedSquare` is not canonicalized as a side effect.

## 5. Geometry and other features

Surface selection changes only `box-shadow`. Dimensions, aspect ratio, border radius, layout, gaps, item spacing, wrapping, and caption styles/colors/typography are unchanged. CSS inset shadows follow the same shape's own border-radius, including circles, legacy 8px Rounded Square, and fully rounded Rectangle pills. They add no square-corner overlay and no additional paint outside the existing boundary.

All six sizes retain their existing values: 32/48/64/96/128/160px sides or height; Rectangles remain twice as wide. Positive-width constraints shrink proportionally. Root/Group/nested Group placement, Hero Space Between, visibility, outer spacing, animation, labels/codes, and guest noninteractivity retain the existing implementation.

## 6. Files changed for this enhancement

Web:

- `src/features/websiteElements/swatches.ts`: resolved Flat default.
- `src/features/websiteElements/schemas.ts`: optional strict surface enum; inferred element type updates automatically.
- `src/features/websiteEditor/components/SwatchesElementEditor.tsx`: Surface Style selector.
- `src/features/websiteRenderer/swatchesSurface.ts`: fixed, geometry-independent shadow lookup.
- `src/features/websiteRenderer/SwatchesElementRenderer.tsx`: apply the selected shadow to the existing shape.
- `src/features/websiteElements/fixtures/swatches-contract.json`: accepted/rejected field fixtures.
- `src/features/websiteElements/swatches.test.tsx`: Flat equality, explicit surfaces, legacy geometry, unrelated edits, copying, and independent owners.
- `src/features/websiteRenderer/swatches.browser.test.ts`: live inspector preview, surface treatment, and expanded exact geometry grid.
- `src/features/websiteRenderer/swatchesSurface.browser.test.ts`: Chrome screenshot and pixel comparisons, including rounded contour checks.
- `docs/swatches-surface-style-enhancement.md`: this report.

API:

- `app/Website/Elements/Swatches.php`: optional field allowlist and strict enum.
- `tests/Fixtures/swatches-contract.json`: identical mirrored fixtures.
- `tests/Unit/SwatchesContractTest.php`: omission/explicit value retention and duplication.
- `tests/Feature/SwatchesBlockTest.php`: both templates, nested palette save/reload, legacy snapshots, publication isolation, public/private guests, custom owners, and invalid writes.

Existing uncommitted Swatches work and unrelated API `ScheduleDaysTransitionTest.php` changes were preserved. `.env`, Maps code/behavior, templates/Sections, and earlier reports were not modified. No dependencies, migrations, commits, pushes, or deployment.

## 7. Automated verification

- **Focused Web regressions: 20 files / 679 tests passed.** Includes Swatches, Maps, Text/Divider/Countdown, Group/Structure, owner lifecycle/isolation, draft saving, fonts, and publishing/snapshot schemas.
- **Focused API regressions: 332 tests / 3,435 assertions passed.** Includes Swatches and existing element/Group/capability/composition, Maps, draft/revision, snapshot/publication, public/private guest, Section lifecycle, and Divider tests.
- **Chrome regression batch: four tests passed**, run serially: Swatches geometry, surface screenshot/pixel comparison, Maps, and Hero root distribution. The Swatches follow-up rerun exercises **1,728 composition cases plus 360 exact shape × size × radius × surface combinations**. It measures preset dimensions, proportional shrinking, circle/square/rectangle/legacy radius, literal fill, shadow layers, no gradient replacement, wrapping/height growth, text ranges, overlap, scroll widths, Groups, Hero containment, and editor/public owner behavior. The live inspector preview checks style changes update rendered shadow treatment immediately.
- **Image comparison:** 60 exact center-color checks and 20 matched surface comparisons across Square, Circle, Rectangle, legacy Rounded Square, and fully rounded Rectangle pills. For each shape/color, Raised and Inset differ from Flat and from each other. Square edge pixels verify opposite lighting direction on white/black/red/gray. Rounded bounding-box corner samples verify no square-corner artifacts. The generated comparison screenshot was also visually inspected, including circular/pill contours. No image package/dependency was added: Chrome renders the PNG and Windows System.Drawing reads pixels. The pixel test explicitly skips where Windows/Chrome is unavailable; it ran here.
- TypeScript/production build, repository ESLint, API Pint on the enhancement PHP files, mirrored-fixture equality, and Web/API diff whitespace checks passed. Build retains the existing warning for a main bundle over 500kB.

No unresolved failures were found in these focused checks. Full repository suites and live production/account testing were not performed. Automated pixels establish distinguishable fixed effects, not a guarantee of identical appearance on every device/display.

## 8. Remaining manual checks

1. In the actual builder select Flat/Raised/Inset on light, dark, saturated, and neutral palettes. Verify the intended subtle upper-left lighting on each real device/display.
2. Check all shapes, Full radius pills, legacy Rounded Square, and Small through 3XL inside narrow/nested Groups and Hero Space Between. Confirm no clipped captions, unexpected scrolling, or visible square edges.
3. Save/reload, duplicate/reorder, and change unrelated caption/size settings. Confirm Surface Style stays selected and legacy shape data is preserved unless explicitly edited.
4. Edit Shared and each custom device owner independently. Publish both templates; compare management preview/public/private sites. Save a draft-only surface change and confirm guest output stays frozen until publication.
5. Keyboard/screen-reader-check the added selector and inspect live Network/Console for errors. These live account, assistive-technology, and real-device checks were not performed.

KIRITA SWATCHES SURFACE STYLE COMPLETE
