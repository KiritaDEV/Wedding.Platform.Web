# Countdown responsive capability audit

Date: 2026-10-12. Scope: source investigation of Web and API, plus temporary Chrome diagnostics. No application code or tests changed. Hero distribution is outside the proposed implementation scope.

## 1. Executive verdict

**The numeric splitting is a verified Countdown readability defect. Current controls provide manual workarounds, but do not reliably preserve atomic values in a four-unit horizontal layout.**

The horizontal Countdown uses a single, nonwrapping flex row. Its units can shrink, their minimum widths are based on the wrapper font rather than the number font, and numeric spans inherit Group containment's `overflow-wrap:anywhere` without overriding it. Consequently an ordinary value such as `12` wraps between characters when its allocated width is too small. The DOM still contains one text node per number; this is CSS line wrapping, not malformed Countdown data or Hero distribution.

Recommend a universal renderer correction that protects numeric strings and allows complete units to move to another row when space runs out. Retain the existing vertical option and typography/gap customization through complete Shared/custom owners. Do not add a wedding-specific layout, alter Group's general long-text containment, or introduce Desktop-first configuration.

Atomic numbers alone are necessary but insufficient: keeping four large numbers in an unbreakable row would replace split digits with overflow. Pair numeric protection with whole-unit reflow and validate intrinsic sizing, labels, and font loading.

## 2. Verified root cause and runtime evidence

### Rendering chain

`WebsiteRenderer` resolves the exact-device Section appearance owner, then a template resolves the Section composition and invokes `HeroSectionRenderer`. The relevant descendant chain is:

```text
Hero shell → foreground → content cluster → SectionRootFlow
  → root OuterSpacingWrapper → WebsiteMotion → WebsiteElementFrame
    → GroupElementRenderer
      → child containment / rendered-child wrappers
        → Countdown OuterSpacingWrapper → WebsiteMotion → WebsiteElementFrame
          → Countdown flex row
            → flex-column unit → numeric span + label span
```

Source references:

- `src/features/websiteRenderer/WebsiteRenderer.tsx:46–59`: exact-device appearance selection; does not rewrite Countdown text.
- `src/features/websiteRenderer/HeroSectionRenderer.tsx:28–43`: usable Hero minimum height and root distribution. This does not make Countdown digits separate DOM elements.
- `src/features/websiteRenderer/SectionChildFlowRenderer.tsx:48–58`: root spacing, motion, frame, Group delegation.
- `src/features/websiteRenderer/GroupElementRenderer.tsx:44–53`: Group flex/grid, width, padding and alignment; `:69–76`: child wrappers and `[overflow-wrap:anywhere]` containment.
- `src/features/websiteRenderer/OuterSpacingWrapper.tsx:6–10`: available width and outer spacing implemented as padding.
- `src/features/websiteAnimation/runtime.tsx:191–196`: motion wrapper DOM; animation affects opacity/transform, not string formatting.
- `src/features/websiteRenderer/WebsiteElementFrame.tsx:28–40`: public frame and Group placement; editor branch adds selection UI around the same child.

### Mechanism

`CountdownElementRenderer`, `src/features/websiteRenderer/CountdownElementRenderer.tsx:49–61`:

1. Direction defaults to horizontal, alignment to center, gap to `m` (1rem).
2. The outer `flex w-full min-w-0 max-w-full` row has no `flex-wrap`, so computed wrapping is `nowrap`.
3. Unit wrappers are `flex min-w-0 flex-col items-center` with normal default `flex-shrink:1`. `minInlineSize` is `4ch` for Days and `3ch` for the others, evaluated using the unit wrapper's inherited font.
4. Numbers independently default to `4xl`, which means **5rem**, not Tailwind's similarly named size (`src/features/websiteRenderer/elementTypography.ts:1`). Normal line height is 1.5.
5. Numeric spans set `font-variant-numeric:tabular-nums`, but no `white-space:nowrap`, atomic sizing or local overflow-wrap reset. Tabular numerals equalize glyph widths; they do not forbid line breaks.
6. Group wrappers explicitly set inherited `overflow-wrap:anywhere`. Normal white-space permits those emergency breaks when a numeric span cannot fit.

Thus flex shrinking creates insufficient width; inherited character-break opportunities determine how the text fails. Large typography and spacing amplify the problem. Group grid divisions, Group padding, Hero padding and block outer spacing can further reduce the available width. They are constraints, not evidence of incorrect Countdown target configuration.

### Actual Chrome measurements

An ephemeral Vite module rendered the existing components and real `src/index.css`, using `WebsiteRenderer`, canonical `{shared: appearance}` and `{compositions:{shared: composition}}` envelopes, a 100svh centered Space Between Hero, root Countdown/Date Group and Names/Venue Group. Both template keys, editor/public modes, and host widths 320/768/1280 were exercised. The existing Hero geometry fixture was reused in memory, with its compact Countdown `xl` override removed to exercise the actual default. No diagnostic was added to application files or tests.

The root Group used width `narrow` (512px cap), existing vertical padding, and block outer spacing. Font resources used the existing fixture context; this is a reproduction, not an inspection of the user's persisted draft.

| Observation | Measured result |
|---|---|
| 320px, editor, both templates | Timer width 320px; each unit 68px; values `12`, `08`, `34`, `56` each split into two lines |
| Numeric glyphs | Approx. 46.02px per digit; two digits need approx. 92.03px |
| Numeric / wrapper fonts | 80px / 16px |
| Computed unit minimum | Days 34.5px; others 25.875px: insufficient to preserve the two large digits |
| Computed Countdown wrap | `overflow-wrap:anywhere`; `flex-wrap:nowrap`; numeric `white-space:normal` |
| Per-character Range geometry | Editor digit tops relative to host were 31px and 151px, confirming separate lines (120px line advance) |
| 768/1280px, editor | Group capped timer at 512px; two-digit sample values stayed on one line |
| Public with deliberately distant target | 26,380 Days split into multiple lines at 320px; at the 512px Group cap even other units could split because Days consumed more width |

Public and editor share the faulty layout. They do not always show the same numeric values: editor intentionally freezes `12/08/34/56`; public calculates the live target. Large runtime day counts therefore expose failures that editor samples can conceal.

**Not verified:** the user's exact saved appearance, screenshot geometry, 390px runtime geometry, production font-loading timing, save/reload or a live published page. Tablet/Desktop correctness reported by the user applies to their configuration, not every supported day count or Group width.

## 3. Current Countdown capability matrix

| Capability | Actual inspector / rendering behavior | Limits and evidence | Verdict |
|---|---|---|---|
| Horizontal/vertical | Direction selector; row or column | No wrap, grid columns or 2×2 control; editor `CountdownElementEditor.tsx:68–72`, renderer `:59` | Supported; horizontal adaptation partial |
| Unit visibility | Four switches; cannot disable final unit | Missing flags mean visible; fixed sequence Days, Hours, Minutes, Seconds; `countdown.ts:3–13`, editor `:56–63` | Supported |
| Unit ordering | No inspector control | `enabledCountdownUnits` filters fixed `COUNTDOWN_UNITS`; schema has no order field | Unsupported |
| Number typography | Font family, friendly weight, size, line height, letter spacing, alignment; italic, underline, strikethrough, shadow/glow and effect colors | Sizes xs–7xl; default 4xl = 80px at 16px root; supported font tuples constrain weight/italic. No no-wrap or fit-to-width control | Supported styling; atomic readability unsupported |
| Label typography | Same role-specific controls plus case | Renderer fallback uppercase/wide/s; role editor displays `textTransform` default `none` despite uppercase semantic fallback. Reset/default presentation deserves separate validation | Supported; default-control fidelity partial |
| Number/label colors | Separate template/project swatches and custom-color actions; role-scoped previews | No need to infer from Text availability; directly wired in `TypographyRole`, renderer role color/effect hooks | Supported |
| Layout alignment | Start, center, end | Outer justification; vertical layout also aligns units. Individual numeric/label alignment is separate typography state | Supported |
| Gap | xs/s/m/l/xl selector | 0.375/0.75/1/1.5/2rem; no zero, row-gap/column-gap or automatic reduction controls | Supported presets |
| Block spacing | Generic inspector's four-sided outer spacing | `WebsitePage.tsx:3130–3190`, `OuterSpacingWrapper.tsx`; padding reduces usable Countdown width. Group padding is a separate owner | Supported |
| Custom unit labels | Four plain-text inputs, max 40 characters | No rich label content; HTML disallowed; blank uses defaults. Long labels not protected by any dedicated fit strategy | Supported |
| Event/custom target | Source selector; custom date/time/timezone inputs; conversion validates invalid local times | Event target uses event `startsAtUtc`; timezone belongs to custom target, not appearance. Main WebsitePage call does not pass `eventTimeZone`, so editor's custom-source fallback is UTC | Supported; event-timezone default UX partial |
| Responsive appearance | Current interface edits the resolved composition owner's base appearance | Low-level Countdown schema/renderer still understand nested responsive state, but current Hero validation rejects authored non-animation nested responsive properties | Supported via full owners; legacy merge path unavailable in Hero |
| Automatic unit reflow | None | Default flex row cannot wrap whole units; no local atomic-number protection | Unsupported |

Typography/color/effect evidence: `src/features/websiteEditor/components/CountdownElementEditor.tsx:66–67,79–123`; `src/features/websiteRenderer/CountdownElementRenderer.tsx:18–25,54–68`; `src/features/websiteElements/schemas.ts:310–340`.

### Can users solve it today?

They can often fit four units using a full-width Group, less horizontal padding, smaller number/label fonts, smaller gap and shorter custom labels. These are real controls. Hiding units is also possible but does not preserve the requested four-unit presentation. A vertical Countdown is a valid readable alternative, with a substantially taller composition.

There is **no universal, reasonable four-large-unit row guarantee** at 320px. In the measured font, four two-digit 80px numbers alone require about 368px, before the 48px default gap total. Choosing smaller typography can work for known content, but large day counts, fonts, labels and parent widths can invalidate it later. Controls cannot express atomic numbers, whole-unit wrapping or 2×2 today.

For Mobile-only design changes, create a custom Mobile presentation, then edit its Countdown. Editing Shared while viewing Mobile changes the Shared owner used by every device without a custom owner.

## 4. Responsive strategy comparison

These are design recommendations and predicted tradeoffs, not implemented or fully browser-tested solutions.

| Strategy | Readability / narrow widths / intrinsic sizing | Labels and large days | Stability, accessibility and consistency |
|---|---|---|---|
| Atomic numeric strings only | Stops digit splits; increases minimum intrinsic width | Long labels still need wrapping; oversized days may exceed container; four-unit row may overflow | Small universal correction, but insufficient alone. Keep existing timer semantic label and DOM order |
| Atomic numbers + whole-unit wrapping | Preserves large readable type; rows follow actual container width instead of device assumptions; unit must not shrink below numeric width | Labels may wrap within bounded units; large Days may occupy its own row. A single number wider than container still needs smaller typography | Natural flow growth; variable row counts across fonts/count changes. Same DOM order and shared renderer for editor/public. Recommended default robustness |
| Explicit responsive columns (e.g. 2×2) | Predictable balanced arrangement; half-width cells require atomic-number-aware minimums | Long labels should wrap; one large count can still exceed half a narrow container | More stable arrangement but needs layout policy/configuration and contract work if selectable. Preserve row-major DOM order; avoid visual CSS reordering |
| Existing vertical layout | One complete unit per row; more width available per value | Most long labels manageable; extreme day strings still require typography choice | Stable stack with large height; normal flow can grow Hero. Existing DOM semantics and controls; no new contract |
| Smaller typography/gaps in custom owner | Retains single row for common two-digit content | Font/label/day-count dependent; insufficient for arbitrary supported text. Changing Group width/padding can help first | Existing controls; typography footprint changes. Complete custom owner prevents Shared spillover. Does not universally repair readability |

All strategies should retain `role="timer"`, `aria-live="off"`, the aggregate `aria-label`, and `aria-hidden="true"` unit presentation (`CountdownElementRenderer.tsx:58–60`). Do not turn every second tick into a live announcement. No strategy requires duplicated responsive DOM. Row transitions should not reorder Days/Hours/Minutes/Seconds.

Tabular numerals already reduce width changes among digits, but Days length changes and fonts loading can still move units between rows. If a future explicit grid is added, test narrow cells rather than assuming that 2×2 guarantees a fit.

## 5. Recommended minimal reusable solution

1. Protect numeric spans locally against character line breaks. This is a universal semantic readability rule, not a Mobile-only styling override.
2. For horizontal layout, allow complete unit wrappers to wrap and size them so flex shrinking cannot force numeric splitting or overlapping spans. Preserve current row appearance when all units fit.
3. Keep labels independently wrappable and bounded; do not apply no-wrap to entire units including 40-character labels. Validate minimum widths using actual numeric typography, not wrapper `ch` assumptions.
4. Preserve vertical direction, authored gap/alignment, colors/effects, target calculation and accessible timer semantics. Keep Group's `overflow-wrap:anywhere` for other content.
5. Continue offering typography/spacing changes through complete custom presentation owners. Do not silently reduce font sizes, hide seconds, or rewrite Shared values based on viewport width.

An exact CSS sizing policy must be proven with browser geometry before implementation is considered complete. No finite container can display an arbitrarily long numeric string at arbitrary authored font size without overflow or scaling. For that extreme case, specify a readable limit/fallback or require smaller authored typography; clipping or splitting digits is not an acceptable accidental fallback. Existing valid targets may yield very large day counts.

Do not add an explicit 2×2 control in the first correction unless renderer-only whole-unit reflow is shown inadequate. That is an optional authored design capability with broader contract cost.

## 6. Responsive ownership and Web/API scope

### Current ownership

- `src/pages/workspace/WebsitePage.tsx:279–284` initializes the editing viewport from `useEditorDeviceCategory`; `responsiveViewport.ts:20–24` classifies Mobile below 768, Tablet from 768, Desktop from 1280. Shared is not Desktop.
- `sectionComposition.ts:31–43` selects custom composition for the exact device or Shared; it does not merge custom children property-by-property.
- `sectionAppearance.ts:5–17` similarly selects the complete exact-device appearance owner.
- `compositionLifecycle.ts:19–33,56–66` copies/regenerates a custom composition, pairs its appearance, and strips legacy nested responsive state.
- `editorComposition.ts:26–29` returns the literal `desktop` as the **base-property addressing convention**, not the selected device or an assertion that Desktop owns Shared. `WebsitePage.tsx:2505–2514,2774` passes this convention to Countdown controls and replaces only the resolved Shared/custom composition.
- `schemas.ts:417–436` recursively rejects non-animation nested `responsive` fields for Hero/Blank. API `WebsiteSectionContentValidator.php:202–225` enforces the same composition restriction. Neither a custom Mobile owner nor Shared permits legacy nested typography/layout overrides inside Hero.

Universal readability belongs in the Countdown renderer. Optional device-specific design belongs in the Countdown appearance inside the selected Section composition. Group layout remains a width/padding constraint; it should not decide Countdown semantic line breaking.

### Contracts, defaults and persistence

- Web Countdown type is inferred from `src/features/websiteElements/schemas.ts:310–340` through `types.ts:30`. Strict allowed fields: canonical target, visibility flags, bounded plain labels, role appearance, direction/alignment/gap, generic spacing/animation. No columns, wrapping or numeric fit property exists.
- `countdown.ts:3–36` defines unit order, defaults, editor sample, calculation/clamping and update cadence. Public resolves event/custom target; editor freezes sample numbers. Hours/minutes/seconds are padded to two characters; Days is not padded or capped.
- API `app/Website/Elements/WebsiteElementValidator.php:386–452` validates canonical targets/timezones, allowed fields, roles, sizes and at least one visible unit. `:204–250` normalizes true visibility/default labels/default horizontal-center-m fields sparsely and checks font tuples/effect colors.
- `app/Website/WebsiteSectionContentValidator.php:168–181` checks Countdown role font/color references against template/project resources; `Elements/CompositionGroupValidator.php:67` permits nested Countdown.
- `app/Actions/Websites/UpdateWebsiteSectionContent.php:29–61` validates content, coordinates mutation and enforces paired custom content/appearance. Validated content is saved on the Section; it is not flattened into a Hero-specific Countdown shape.
- `app/Website/Publishing/PublishedWebsiteSnapshotBuilder.php:28–31,43–62` reads saved state, validates/normalizes and serializes Section presentations. `PublishedWebsiteSnapshotStore.php:17–43` reads/replaces the published JSON separately from drafts. Web `websitePublishing/snapshot.ts:8–25,62–76` decodes strict snapshot structure.

| Proposal | Renderer | Inspector / Web/API validators | Snapshot / migration |
|---|---|---|---|
| Atomic numbers | Local Countdown change | None | Existing authored data still valid; no migration |
| Automatic whole-unit wrapping | Local Countdown sizing/layout | None if universal behavior, not a saved option | Existing snapshots render with updated code; authored snapshot isolation remains, but pixels are not renderer-version isolated |
| Vertical or smaller styles | Already available | None; edit base of complete custom owner | Save and publish existing fields; no migration |
| User-selectable wrapping/grid columns | Renderer and saved appearance property | Countdown inspector, strict Web schema, API allowed-field validation/default normalization and tests | Optional property with old-data default, strict snapshot acceptance, round-trip tests; no migration expected if absence remains supported |

A renderer-only correction does not require republishing to change the CSS used by already published snapshots. A new authored appearance requires saving and publishing to affect the guest snapshot. No persistence redesign is recommended.

## 7. Gaps by priority

| Priority | Gap / root cause | Exact affected systems |
|---|---|---|
| P0 | Ordinary numeric values split into lines: inherited anywhere breaking, absent atomic span behavior, shrinkable unit sizing unrelated to numeric font | `CountdownElementRenderer.tsx:59–60`; inherited context from `GroupElementRenderer.tsx:74–76` |
| P1 | Horizontal layout has no whole-unit reflow; no-wrap-only fixes risk overflow/overlap | Countdown flex row and unit intrinsic sizing; existing direction/gap controls |
| P1 | Geometry coverage does not inspect digits; frozen editor sample conceals large live day counts | Countdown SSR tests, generic Hero browser fixture, countdown calculation tests |
| P1 | Width, long-label, font-loading and large-day behavior lack a proven responsive policy | Countdown renderer + font loading + Group constraints; proposed geometry suite |
| P2 | Explicit 2×2 / column-count control absent | Countdown appearance schema, inspector, API validator and snapshot schema if later added |
| P2 | Inspector semantic defaults require review (label case display, custom target timezone fallback) | `CountdownElementEditor.tsx:52,98`; `WebsitePage.tsx:2774`; renderer label fallback |

The legacy nested responsive schema is not a workaround gap to fix by reopening Hero contracts. Complete custom ownership is intentional and usable.

## 8. Independently testable phases (recommendations only)

1. **Reproduce and protect numbers:** add failing actual-browser digit-line assertions using default 4xl within Hero/Group. Implement local atomic numeric spans and intrinsic sizing as a reviewable change; do not ship an overflow-producing half-fix.
2. **Complete narrow-container behavior:** implement whole-unit reflow, retain horizontal/vertical alignment, and prove labels/day counts, normal-flow growth, no overlap and font-load stability. Ship phases 1–2 together if atomic protection otherwise overflows.
3. **Ownership and lifecycle verification:** exercise complete Shared/custom owners, edit/save/reload/publish, ensure old snapshots and independent devices remain valid. No new fields required for recommended renderer behavior.
4. **Optional polish:** only if product evidence requires deterministic 2×2, propose an explicit reusable Countdown layout control with strict parity and absent-property compatibility. Investigate inspector semantic defaults separately.

No phase was implemented during this audit.

## 9. Existing coverage and required verification

### Why coverage missed this

- `src/features/websiteRenderer/CountdownElementRenderer.test.tsx:10–54` uses server-rendered markup, primarily Desktop; asserts text strings, colors and accessible semantics. Correct `>08<` markup can still paint as two lines.
- `src/features/websiteElements/countdown.test.ts:7–39` verifies canonical data, calculation boundaries, timezone conversion, labels and visibility, not layout.
- `src/features/websiteEditor/components/CountdownElementEditor.test.tsx` verifies switches, weights, formatting and swatches through SSR; no narrow browser geometry.
- `src/features/websiteFonts/fontLoader.test.ts:66` checks font collection including nested Countdowns, not loaded glyph dimensions.
- `src/features/websiteRenderer/rootFlowDistribution.browser.test.ts:42,66–87` includes Countdown but explicitly uses compact `xl` (36px), asserts root anchor/height geometry and existence of Countdown, and does not inspect per-digit lines. The test can pass while default 4xl fails.
- API `tests/Unit/WebsiteElementValidatorTest.php:382–394` verifies Countdown target/labels/visibility. API and snapshot tests cannot establish CSS painting correctness. Snapshot serialization coverage does not replace guest browser checks.

Existing tests were inspected, not rerun as a regression suite for this read-only audit. The temporary Chrome reproduction was executed successfully after correcting a diagnostic script syntax error; it is not a committed test or a claim of passing application tests.

### Automated checks to add

Use real Chrome, real CSS and the full WebsiteRenderer plus focused Countdown cases:

- 320px, 390px, 768px and 1280px; also narrow actual Group containers within wide viewports. Both templates, modes, Shared and independently paired custom compositions.
- Default and authored sizes/font families/weights/letter spacings; wait for `document.fonts.ready`, then measure again. Also inspect fallback-font state before loading.
- Values 0, 9, 12, 99, 100, 9999 and large valid day counts; preserve `08` padding. Use a controlled clock for public values; do not compare editor sample text to live public numbers.
- Default labels, short labels, spaced long labels and 40-character unbroken labels; 1–4 visible units and fixed semantic ordering.
- Horizontal/vertical, full/narrow Group widths, nested Groups and grid divisions, authored padding/outer spacing, Hero normal flow and overflow growth.
- **Atomic numbers:** Range geometry for each character of a numeric text node must have one distinct line top (within rounding tolerance); do not rely on span bounding height or `textContent` alone.
- **Containment:** numeric and label rectangles must remain within their unit/Countdown content bounds. Assert sibling unit rectangles do not overlap; for wrapping rows, line tops group by unit and order remains sequential.
- **No overflow/clipping:** verify timer, Group and Hero scrollWidth <= clientWidth within rounding tolerance; numeric ranges within visible ancestors; no hidden overflow used to mask unreadable text.
- **Normal flow:** Countdown wrapping/vertical growth must increase Group/root height and, when necessary, Hero height without overlap. Keep Hero's already verified distribution behavior untouched.
- **Stability/accessibility:** compare before/after loaded font geometry, number-length/timer rollover, preserve aggregate aria-label, role/live policy and hidden visual units.
- **Lifecycle:** save/reload complete Mobile custom owner, ensure Shared/Tablet/Desktop unchanged, publish and verify guest snapshot appearance; change draft afterward and verify published authored data unchanged.

For renderer-only phases, existing API contract/snapshot round trips should remain unchanged. If a selectable layout property is later approved, add explicit unknown-field, malformed-type, enum/default, nested-ownership rejection and legacy-snapshot compatibility tests in both Web and API.

### Manual checks

Reopen the user's actual Shared Hero at Mobile; confirm loaded fonts, actual content width and target count. Compare editor, preview and guest page at 320/390 and landscape widths. Create custom Mobile only if desired, edit typography/layout and verify other owners remain unchanged. Check long translated labels, a large Days count, browser zoom/text enlargement, selection overlays, and timer rollovers. Confirm that a wrapped/vertical Countdown can grow without crowding Date or lower Hero content.

## 10. Audit boundaries and repository state

Web: `develop`, HEAD `d87a5aa`. API: `develop`, HEAD `4121bda`. Both contain pre-existing Phase 1/Hero working-tree changes; these were preserved. Only this Markdown report was created. No application or test edits, API mutations, migrations, dependency changes, commits, pushes or saved-draft/publication writes occurred. Temporary browser profiles and Vite cache lived outside the repositories and were cleaned up.

All code references describe the current working tree, including uncommitted Hero changes. Runtime evidence uses a representative fixture, not a production-state capture. Responsive strategy outcomes beyond the measured existing renderer remain predictions requiring the focused geometry and lifecycle verification above.
