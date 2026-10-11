# Schedule Phase 4

Phase 4 adds placement-owned typography, formatting, visibility and width without changing Schedule Days/Activities, shared definition identities, endpoints or database schema. Existing uncommitted work in both repositories was preserved.

## Appearance contract and defaults

All new fields are optional within `ScheduleElement.appearance`. Defaults resolve during rendering and are not written into old blocks. Existing Timeline, List, Cards, outer spacing and animation settings remain valid.

| Field | Accepted values | Omitted behavior |
| --- | --- | --- |
| `typography` | Strict object with the six roles below | Existing Schedule typography |
| `dateFormat` | `long`, `short`, `weekday` | Existing `YYYY-MM-DD` display |
| `timeFormat` | `12-hour`, `24-hour` | 12-hour |
| `showDescriptions` | JSON boolean | Show |
| `showLocations` | JSON boolean | Show |
| `showMapLinks` | JSON boolean | Show |
| `dayGap` | `none`, `xs`, `s`, `m`, `l`, `xl` | Existing heading margins |
| `contentWidth` | `full`, `wide`, `medium`, `narrow` | Full container width |
| `contentAlignment` | `start`, `center`, `end` | Left |

The width presets reuse Group sizes: full = 100%, wide = 72rem, medium = 48rem, narrow = 32rem. Actual width never exceeds the parent. Alignment positions the constrained block using logical auto margins. The inspector hides content alignment at full width.

Typography roles are `dayHeading`, `activityTime`, `activityTitle`, `activityDescription`, `activityLocation`, `activityMapLink`. Each accepts the existing Text fields `fontFamilyId`, `fontSize`, `fontWeight`, `italic`, `colorId`, `alignment`, `lineHeight`, `letterSpacing`, `underline`, `strikethrough`, and the canonical Text `responsive` shape. Unknown roles and fields are rejected. Empty roles and empty typography objects normalize away.

Font sizes reuse Text's `xs` through `7xl`; weights are numeric 400, 600 or 700 and must be supported by the selected family. Italic must also be supported. Alignment is start/center/end, line height tight/normal/relaxed, and letter spacing tight/normal/wide. Font and color identifiers pass the existing catalog and Template/project resource boundaries. Null values, numeric strings for weights, and numeric/string booleans are rejected.

Text effects and text transforms are excluded from this phase's compatible typography subset. They are not necessary for the requested typography controls. No new font registry, unsupported units or parallel font semantics were added.

Omitted typography fields inherit Schedule's existing CSS: heading/time/title emphasis, description opacity, map-link underline, and surrounding font, size and line height. Explicit Normal writes 400 so it can override Schedule's default 600 emphasis. Explicit map-link underline off overrides the existing link decoration.

## Implementation and inspector

`ScheduleAppearanceEditor` uses one selected role inside the existing InspectorDisclosure. It reuses FontPicker, friendly font-weight labels, font capabilities and normalization, Text formatting buttons, Font size options, Select, Switch and WebsiteColorSwatchControl. Color previews are scoped to Section, placement and role. Controls update the existing placement edit boundary immediately; no save is needed for preview.

`ScheduleTypography` serves all six roles across all three layouts. It reuses runtime Text appearance/resource resolution, font stacks and elementTypography values. Schedule fonts are collected from every shared/custom composition, including nested Groups, by the existing font loader.

## Formatting

Dates are formatted with `Intl.DateTimeFormat('en-US')` and an explicit UTC timezone. The calendar components are assigned with UTC setters, including years below 100; no local timezone conversion is involved. Examples: October 24, 2026; Oct 24, 2026; Saturday, October 24, 2026. Omitting dateFormat preserves the existing ISO date display.

Custom Day titles retain precedence. Multiple undated Days retain Day 1, Day 2, etc. A single renderable Day still has no heading. Canonical HH:mm times format arithmetically into 12-hour display or render unchanged in 24-hour mode. Both endpoints of optional ranges use the same format. Stored dates and times are untouched; no overnight behavior was added.

## Visibility, spacing and width

Each visibility toggle independently omits its field's markup, including map hrefs, from editor and guest DOM. Authored content remains available when re-enabled or displayed by a sibling placement. Existing Day/Activity visibility and untitled filtering still apply.

Guest API presentation also nulls fields hidden by every visible referencing placement. A shared field remains in the shared guest definition when another visible shared/custom placement displays it. This is the union of display requirements, preserving the existing contentId model. Local placements receive their own redacted projection. Filtering clones presentation objects and never edits stored snapshots or drafts. Image reference retention and media authorization behavior remain unchanged.

Day gap uses existing spacing presets. Activity spacing reuses Phase 3 Row spacing for Timeline/List and Card gap for Cards; no duplicate Activity-gap field was added. Width/alignment wrap the same container-aware layout. Container queries, wrapping and capped Card padding continue to handle narrow nested Groups.

## Responsive and publishing integration

The current editor's `authoredPropertyViewport()` targets the base appearance of the resolved shared/custom Section composition. No additional device selector or authored responsive layer was introduced. Explicit device compositions retain independent typography, layout, formatting, toggles, spacing and width while referencing the same shared definition.

As with Text, canonical typography schemas can recognize font-size/alignment responsive values at the primitive renderer level, but Section authored-state boundaries reject such responsive branches and require custom composition ownership. Existing lifecycle behavior remains authoritative.

Atomic Save Draft, stale-revision rejection, snapshot publication and snapshot-only public/private rendering are unchanged. Tests verify appearance persistence, independent Mobile appearance, shared semantic retention, failed-save revision preservation, published appearance isolation and republishing. No migration or live database reset was performed. Integration tests use the existing in-memory SQLite test configuration; they do not establish concurrent MySQL behavior.

## Web/API parity

Web typography derives from the canonical Text Zod contract. API validation reuses the existing Text rules and font-tuple validator, with strict JSON scalar checks for Schedule role weights and booleans. Both sides enforce the same role names, fields, enums, spacing/width values and font capabilities.

API request and stored-snapshot JSON checks require typography, role and responsive branch objects rather than arrays. API Section validation checks nested role resources using existing Text font/color allowlists. Web draft/public/snapshot normalization checks the same resource allowlists against the supplied Template, including captured snapshot descriptors and project colors.

## Files changed in this phase

Web created:
- `src/features/websiteEditor/components/ScheduleAppearanceEditor.tsx`
- `src/features/websiteElements/scheduleFormatting.ts`
- `src/features/websiteRenderer/ScheduleTypography.tsx`
- `src/features/websiteRenderer/schedulePhase4.test.tsx`
- `docs/schedule-phase4.md`

Web modified (including pre-existing untracked Phase 3 files):
- `src/features/websiteElements/scheduleAppearance.ts`
- `src/features/websiteEditor/schemas.ts`
- `src/features/websiteFonts/platformFonts.ts`
- `src/features/websiteFonts/fontLoader.test.ts`
- `src/features/websiteRenderer/ScheduleElementRenderer.tsx`
- `src/features/websiteRenderer/WebsiteLeafElementRenderer.tsx`
- `src/features/websiteRenderer/scheduleLayouts.css`
- `src/features/websiteRenderer/scheduleLayouts.test.tsx`
- `src/features/websiteRenderer/scheduleLayouts.browser.test.ts`
- `src/pages/workspace/WebsitePage.tsx`
- `src/pages/workspace/WebsiteSharedContent.browser.test.ts`

API created:
- `tests/Unit/ScheduleTypographyTest.php`

API modified:
- `app/Website/Elements/ScheduleAppearance.php`
- `app/Website/Elements/WebsiteElementValidator.php`
- `app/Website/WebsiteSectionContentValidator.php`
- `app/Website/Publishing/PublishedWebsitePresentation.php`
- `tests/Unit/ScheduleAppearanceTest.php`
- `tests/Feature/SharedContentTest.php`

## Verification

Focused tests cover all six role contracts, fonts/colors/bounds, timezone-safe date formatting, midnight/noon and both time formats, headings, visibility and DOM omission, width and spacing, all layouts, actual Hero/Blank/nested Group renderer paths, device compositions, font collection, aggregate save/reload/conflicts and public/private snapshot isolation.

| Check | Result |
| --- | --- |
| API focused: ScheduleTypographyTest, ScheduleAppearanceTest, SharedContentTest | 56 passed, 254 assertions |
| Web focused: Phase 4, layout integration, shared content, snapshot/guest presentation and real editor save/conflict tests | 107 passed across 6 files |
| Additional Web layout geometry and font collection checks | Passed (35 tests including overlapping layout integration coverage) |
| Full API: `php artisan test --compact` | 843 passed, 1 existing failure; 5,486 assertions |
| Full Web: `npm test` | 1,410 passed, 2 existing failures across 132 test files |
| TypeScript: `npx tsc -b --pretty false` | Passed |
| ESLint: `npm run lint` | Passed |
| Production build: `npm run build` | Passed with existing large-bundle warning |
| Full Pint: `vendor/bin/pint --test` | Passed |
| `git diff --check` in both repositories | Passed |

The API baseline failure is `PrivateInvitationClaimTest`'s cookie-domain assertion (null versus empty string). The two Web baseline failures are direct component invocation/useContext errors in `SectionChildFlowRenderer.test.tsx`. These unrelated failures were not modified. The full API run preceded the final numeric-equivalent font-weight check; the final focused API run includes that check and passes.

Browser tests exercise the real WebsitePage inspector and measure long-text layout geometry at 180/320/480/800px container sizes under desktop and mobile browser widths. Their persistence transport is mocked; separate API feature tests exercise actual persistence and publication.

## Remaining risks

The full suites are not clean because of the three known baseline failures. The existing production bundle warning remains. SQLite feature tests and mocked browser transport do not prove concurrent MySQL locking or behavior against a running production deployment. Per-placement visibility controls presentation; a field shown by another placement remains available in their shared guest definition. No new compatibility or data-safety blocker was found within Phase 4.

## Manual smoke test

Create a two-Day shared Schedule inside a narrow nested Group. Select Activity title typography, choose a larger font and Normal weight, switch to weekday dates and 24-hour time, hide descriptions, and set Narrow/Center width. Verify immediate preview in Timeline/List/Cards. Save and reload, then Publish Changes. Customize Mobile with different typography and description visibility. Save without publishing and verify the guest site stays unchanged; republish and verify the new appearance while both devices still share the authored Activities.
