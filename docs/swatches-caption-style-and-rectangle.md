# Swatches: caption styles and Rectangle

Implemented 2026-10-14 in Web and API. This extends the existing MVP without changing Section/template registration, collection limits, item identities, generic spacing/motion, or composition ownership. The prior audit and MVP reports remain historical records; this document supersedes their fixed caption surface and three-shape appearance descriptions.

## 1. Contract changes

The optional Swatches `appearance` object now accepts:

| Field | Accepted values | Missing-field resolution |
| --- | --- | --- |
| `captionStyle` | `plain`, `soft` | `soft`, preserving the MVP |
| `captionTextColor` | opaque six-digit hex | `#111827` |
| `captionBackgroundColor` | opaque six-digit hex | `#FFFFFF` |
| `shape` | `circle`, `roundedSquare`, `square`, `rectangle` | `circle` |

Example:

```json
{
  "appearance": {
    "shape": "rectangle",
    "size": "medium",
    "captionStyle": "soft",
    "captionTextColor": "#112233",
    "captionBackgroundColor": "#EEF2F6",
    "showLabels": true,
    "showHex": true
  }
}
```

Both applications accept six-digit hex input with either case and normalize it to uppercase `#RRGGBB`. They reject alpha, shorthand, whitespace, gradients, CSS names/functions/variables, nulls, nonstrings, and unsafe formats. New fields are optional, with strict unknown-field rejection. Caption colors remain literal values independent of Theme/project color references. Typography retains its existing bounded role contract.

## 2. Backward compatibility

The old renderer always used a white surface, dark text, 4px caption padding, and a 4px radius. **Missing `captionStyle` resolves to Soft**, with exactly those defaults. Schemas and API normalization do not inject a style into historical content or rewrite snapshots.

**New creation explicitly stores `appearance: { captionStyle: "plain" }`.** This distinguishes new blocks from old blocks without a migration, discriminator change, or website schema-version bump. Existing three neutral colors and hidden label/hex defaults remain. Duplication and custom-owner cloning copy the source appearance: an old block retains its implicit Soft behavior; a new block retains its explicit Plain behavior.

Optional fields travel through existing draft storage, raw JSON validation, resource serialization, snapshot build/read, and public/private presentation. Previously published Swatches without the new fields still decode. Saving a draft appearance change does not alter already published guests. API and Web support must be released together before exposing the new fields; older strict clients/validators cannot be assumed to accept them. No deployment was performed.

## 3. Caption rendering

- **Plain:** no caption background, surface radius, or chip padding. Configured text color and existing typography still apply.
- **Soft:** configured opaque background and text colors, 4px padding, and 4px surface radius. Missing colors preserve the original white/dark treatment.
- Switching to Plain preserves `captionBackgroundColor` in data but does not render it. Switching back to Soft restores that saved color. Even inactive background values must pass color validation.
- Label and hex visibility remain independent. Each item's visible captions stay beneath its own shape and wrap within its bounded width. Without either visible caption, no caption surface is emitted.
- Existing accessible list/item descriptions remain available even when captions are visually hidden. Visual duplicates and shapes remain aria-hidden; guest output is noninteractive.

Configured colors are used accurately rather than silently adjusted for contrast. Plain text can sit over arbitrary Section imagery; manually check its readability there. Soft allows a predictable contrast pairing, but user-selected text/background combinations still need a contrast check.

## 4. Rectangle dimensions and flow

| Size | Existing square/circle sides | Rectangle width × height |
| --- | --- | --- |
| Small | 32px | 64 × 32px |
| Medium | 48px | 96 × 48px |
| Large | 64px | 128 × 64px |

Rectangle uses a **2:1 aspect ratio and square corners**. It is distinct from Rounded Square's 8px radius. There are no arbitrary dimensions or radius controls. When available positive width is smaller than the preset, both dimensions shrink proportionally; a tested 24px boundary produces a 24 × 12px rectangle.

Item target width now accounts for the rectangle's wider geometry as well as the existing 96px caption target. Natural flex wrapping, all spacing presets, local/Group alignment, outer spacing, and normal document flow remain in effect. Group padding/grid tracks determine actual available width; device detection does not determine internal wrapping. Hero Space Between and vertical growth use the existing wrappers. Zero usable width after excessive parent padding remains outside readable supported containment.

Shared remains distinct from Desktop. Custom device owners clone complete independent compositions. Caption/shape changes edit only the resolved owner, with no nested legacy responsive overrides or shared global palette introduced.

## 5. Inspector changes

The existing Shape selector adds Rectangle. The Captions section adds:

1. Caption style: Plain / Soft.
2. Caption text color: existing literal ColorPicker and hex input.
3. Caption background color: the same control, shown only for Soft.

Existing typography controls follow these fields. Pickers commit only validated colors; temporarily invalid text does not replace saved color values or leak through another appearance edit. Collection editing/reordering, minimum/maximum enforcement, last-item protection, and keyboard-accessible row actions remain unchanged. No project color library call is introduced.

## 6. Files changed by this enhancement

Web:

- `src/features/websiteElements/swatches.ts` — compatibility defaults and explicit new-creation Plain style.
- `src/features/websiteElements/schemas.ts` — optional caption fields and Rectangle enum.
- `src/features/websiteRenderer/SwatchesElementRenderer.tsx` — conditional surfaces/colors and 2:1 shape geometry.
- `src/features/websiteEditor/components/SwatchesElementEditor.tsx` — caption controls and Rectangle choice.
- `src/features/websiteElements/swatches.test.tsx` — defaults, legacy rendering, colors, reordering, and owner isolation.
- `src/features/websiteElements/fixtures/swatches-contract.json` — mirrored accepted/rejected appearance cases.
- `src/features/websiteRenderer/swatches.browser.test.ts` — expanded actual Chrome geometry and inspector interactions.
- `docs/swatches-caption-style-and-rectangle.md` — this report.

API:

- `app/Website/Elements/Swatches.php` — strict fields/enums and color normalization.
- `tests/Unit/SwatchesContractTest.php` — mirrored contract, legacy omission, normalization, and copy preservation.
- `tests/Feature/SwatchesBlockTest.php` — both templates, draft round-trip, legacy snapshots, public/private publication, and independent Mobile appearance.
- `tests/Fixtures/swatches-contract.json` — identical contract fixtures.

Existing uncommitted MVP work and the unrelated `tests/Unit/ScheduleDaysTransitionTest.php` change were preserved. `.env`, Maps behavior, templates, Sections, database schema, and existing documentation were not changed. No dependencies, commits, pushes, or production deployment.

## 7. Verification results

- **Web focused regressions: 20 files / 520 tests passed.** Includes Swatches, Text/Divider/Countdown/Maps, Group and insertion operations, owner lifecycle/isolation, draft saving, fonts, and publishing/snapshot schemas.
- **Swatches Chrome: 864 rendered cases passed**, plus real React inspector interactions. Both templates; 320/768/1280 widths; 1/3/12 entries; all four shapes and three sizes; root/Group/nested/narrow placement; editor/public render modes and Shared/custom owners. Rectangle coverage includes all six gaps, all alignments, implicit legacy/Plain/Soft styles, and all label/hex visibility combinations.
- Geometry checks measure exact unconstrained preset sizes, aspect ratios, shape corners/fills, caption surface/text colors, text character ranges, wrapping and natural height growth, item overlap, scroll width, Group/Hero containment, and a 24 × 12px constrained rectangle.
- Inspector checks verify new Plain defaults, conditional background controls, normalization/invalid-input preservation for both caption colors, background retention when switching styles, all Shape choices, and existing collection actions/bounds.
- **Existing Maps and Hero root-distribution Chrome regressions: 2 tests passed**, run serially.
- **API focused regressions: 328 tests / 3,050 assertions passed.** Includes Swatches, Maps, element/Group/capability/owner contracts, draft/revision saves, snapshot/publication tests, public/private guest routes, Section lifecycle, and Divider contracts.
- TypeScript, repository ESLint, production build, API Pint for the enhancement PHP files, and Web/API whitespace checks passed. Build retains the existing main-chunk warning above 500kB.

No unresolved failures were found in these focused runs. Full repository suites, production headers, real-device testing, and assistive-technology testing were not performed. The initial TypeScript check caught a new test accessing appearance on the broad creation union; the test now narrows through the Swatches schema and the production build passes.

## 8. Remaining manual checks

1. Open an existing saved/published palette with visible captions; confirm its Soft appearance remains unchanged without editing or republishing it. Insert a new palette and confirm Plain is selected.
2. Change both caption colors, enter invalid temporary hex, switch Soft→Plain→Soft, save/reload, and confirm the background value survives but is hidden/ignored in Plain.
3. Inspect Rectangle sizes, every gap/alignment, long labels, hex-only/label-only captions, narrow nested Groups, and Hero Space Between on real mobile/tablet/desktop devices and at increased text zoom.
4. Check text contrast over actual Section backgrounds and configured Soft surfaces. Keyboard/screen-reader-check editor controls and the noninteractive guest list.
5. Edit Shared and custom Mobile independently; duplicate/reorder; verify labels, colors, appearance, and refreshed copy identities. Publish both templates and inspect public/private sites and management preview.
6. In live DevTools confirm no unexpected scrolling, font/hydration errors, or project-color mutations. Draft-only style changes must leave guest output unchanged until publication.

KIRITA SWATCHES CAPTION STYLE AND RECTANGLE COMPLETE
