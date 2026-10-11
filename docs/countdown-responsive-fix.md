# Countdown responsive fix

Date: 2026-10-12. This change is confined to Countdown rendering, focused tests and this report. Existing Hero changes and the API working tree were preserved. No contracts, controls, migrations, dependencies, commits or pushes were added.

## 1. Root cause

Group child containment intentionally inherits `overflow-wrap:anywhere`. Countdown previously rendered a nonwrapping horizontal flex row with shrinkable unit wrappers. Its `4ch`/`3ch` minimums were based on the inherited wrapper font, not the much larger numeric typography. Numeric spans did not override character breaking. In a narrow container, a single numeric string such as `12` therefore painted on separate lines.

See `docs/countdown-responsive-capability-audit.md` for the source audit. The new actual-Chrome regression was added before the renderer correction. Once its fixture used valid independent custom IDs, it failed against the original renderer with:

```text
FAIL Split digits default/320/editor/shared/classic-filipiniana-v1 12
```

The failure used per-character Range rectangles, not text equality or an SSR assertion.

## 2. Exact implementation changes

- `src/features/websiteRenderer/CountdownElementRenderer.tsx`: local rendering styles only.
- `src/features/websiteRenderer/CountdownElementRenderer.test.tsx`: focused assertions for atomic spans, horizontal wrapping and retained vertical behavior.
- `src/features/websiteRenderer/countdownResponsive.browser.test.ts`: real Chrome geometry and snapshot/owner fixture coverage.
- `docs/countdown-responsive-fix.md`: this report.

The outer horizontal row now uses `flex-wrap:wrap`. Its unit wrappers use `flex-shrink:0`, `inline-size:max-content` and `max-inline-size:100%`. Existing small minimum-width floors remain; actual number typography now contributes its intrinsic unbroken width instead of being squeezed into the floor.

Numeric spans set `white-space:nowrap`, `overflow-wrap:normal` and `word-break:normal`, after the existing authored typography/effects. Labels independently use `max-inline-size:100%` and `overflow-wrap:anywhere` so a 40-character unbroken label can break within a bounded unit. No no-wrap is applied to the label or whole unit.

The vertical branch retains its column direction, justification, alignment, gaps and unit sizing. Numeric protection and bounded label wrapping apply there too; horizontal-only flex wrapping and nonshrinking intrinsic sizing are not applied to vertical units.

No changes were made to Hero distribution, Group containment, the inspector, date/time calculation, unit visibility/order, role styles or font resources, ownership resolution, persistence or Web/API validation.

## 3. Behavior before and after

| Case | Before | After |
|---|---|---|
| Narrow horizontal four-unit Countdown | Units shrink; digits can split between lines | Complete units move to later rows; each numeric string stays on one line |
| All enabled units fit | Single horizontal row | Single horizontal row retained, with authored gap/alignment |
| Long label | Inherited emergency wrapping could coexist with split numbers | Label can wrap independently; numeric line remains protected |
| Vertical layout | Column of units | Column retained; same ordinary formatting and alignment |
| Large day count | Could break within number | Complete number preserved; may occupy its own row |
| One number physically wider than the container | Accidental line breaking | Intrinsic overflow remains an explicit limitation; no automatic font shrinking, truncation, ellipsis or digit removal |

## 4. Sizing and wrapping strategy

Sizing follows available content width; no device breakpoints or fixed 2×2 grid exist. A horizontal unit requests its content width, bounded by the Countdown width. Numeric content supplies an unbroken intrinsic width; labels retain emergency wrapping. The flex row moves whole units when their widths plus authored gaps cannot fit.

The preserved `justify-content` control aligns each horizontal row. Gap is meaningful between both adjacent units and wrapped rows. Days/Hours/Minutes/Seconds stay in their original DOM order. There is no responsive DOM duplication, CSS reordering, hidden unit or changed authored appearance.

Normal flow determines height. Additional rows increase Countdown and Group height; Hero's existing usable minimum-height/distribution path can grow when content exceeds the viewport. Selection frames and motion wrappers were not changed.

## 5. Geometry coverage and results

The Chrome test uses real application CSS, the full `WebsiteRenderer`, canonical appearance/composition envelopes and nested Groups in a centered 100svh Space Between Hero. It renders 528 cases and measures each twice, including after `document.fonts.ready` and explicit loading of platform system fonts.

Coverage includes:

- Both existing templates; 320/390/768/1280px host widths; editor/public modes.
- Shared and custom owners. All three custom device presentations are created using `createCustomSectionPresentation`, which regenerates IDs and pairs complete appearance owners; Shared intentionally differs.
- Horizontal/vertical layouts; one, two, three and four visible units.
- Live/public day values 0, 9, 99, 100, 9999 and 100000, plus 12 in the standard editor/public sample. Public clock is controlled; hours/minutes/seconds preserve two-character padding.
- Default labels, a long spaced 40-character label and an unbroken 40-character label.
- Default typography, compact `xl`, extreme `7xl`, fixture fonts and alternate platform Courier New.
- Full/narrow nested Groups; a Group grid; Group padding and Countdown outer spacing; start/end alignment and smaller authored gaps.

Assertions inspect every numeric character's Range rectangle for a single line top. Representative fitting cases additionally check character containment, label glyph containment, no horizontal scroll overflow, pairwise unit nonoverlap, sequential visual order, and timer accessibility. Long-label cases must actually form multiple label lines in narrow cases.

Default Mobile cases must form additional unit rows and grow naturally in height. Default wide cases must retain one row. Vertical cases must remain sequential columns. Root spacing-wrapper rectangles must align to Hero flow boundaries, contain the Countdown's height and avoid top/bottom root overlap, including tall long-label content.

The extreme scenario deliberately asserts that a numeric span is wider than its available timer width, while still keeping every digit on one line. That scenario is excluded from ordinary fit guarantees; this is a measured boundary, not a hidden failure.

### Validation record

- Original renderer: new Chrome regression failed on split `12` at 320px before implementation.
- Updated renderer: targeted Countdown browser and component checks passed (6 tests).
- Final focused Countdown, Hero, Group, ownership, font collection and snapshot run passed: **147 tests across 11 files**, with file parallelism disabled. The Chrome test confirmed all **528 geometry cases**, measured before and after font readiness.
- TypeScript (`npx tsc -b`), ESLint, production build and `git diff --check` passed.
- Production build reported its bundle-size warning; no build failure.
- Broader suite: 1421 passed, 6 failed. Two existing `SectionChildFlowRenderer.test.tsx` cases directly invoke a hook-using component and fail before reaching Countdown. Gallery focus assertion and RSVP browser timeout also failed. The new Countdown browser test and existing Hero distribution browser test timed out under the concurrent browser workload.
- Sequential follow-up: Countdown browser/component checks passed (6 tests); Hero distribution, RSVP layout and Gallery checks passed (23 tests across three files). This supports concurrent browser contention/flakiness for those broader failures; it does not make the full suite green. The unchanged direct-component hook errors remain unrelated to this renderer change.

## 6. Lifecycle and accessibility verification

The browser fixture serializes/reloads existing-shaped content through JSON, creates independently identified custom Desktop/Tablet/Mobile presentations with the canonical lifecycle helper, decodes the existing strict published snapshot contract and normalizes it through the public renderable decoder before rendering. No new field or snapshot version is introduced.

After snapshot construction, draft content is deliberately emptied; the decoded snapshot must retain its original elements. Rendering a custom owner must still produce its Countdown and two-root layout even though Shared contains different content. Existing snapshot decoder tests also run as focused coverage.

`role="timer"`, `aria-live="off"`, aggregate `aria-label`, and presentation units' `aria-hidden="true"` are verified. Existing semantic tests verify frozen editor sample, zero-padded text, colors, unit visibility and unresolved target handling. Timer effects, update cadence and target/timezone semantics were untouched.

These checks establish JSON/snapshot/renderer compatibility and memory isolation. They do **not** claim an actual API save/reload/publish session or database snapshot write. Existing already-published authored data needs no migration; deployment changes renderer presentation. Draft edits must still be explicitly published to change authored guest content.

## 7. Extreme-value limitation

An unbreakable number at a sufficiently large authored font cannot fit an arbitrarily narrow container. The test makes this explicit with 100000 Days at `7xl` (9rem) inside a nested narrow Group. It measures the numeric span against the actual timer width rather than assuming all large values fit.

The renderer does not reduce font size, truncate, add ellipses or add overflow clipping. Existing ancestor policies, including Hero's horizontal overflow clip, may hide part of physically oversized content. That existing architecture was not changed: this correction cannot guarantee all extreme digits are visible inside such ancestors. Choose a smaller authored size or wider available container for that boundary. Representative fitting cases must pass containment/no-overflow assertions; an ordinary two-digit Mobile value is not treated as extreme.

## 8. Remaining manual checks

Verify the actual existing wedding Hero in editor, preview and guest view at 320/390px, Tablet and Desktop, with its saved font/spacing settings. Confirm independently customized presentations, translated labels, live target count and timer rollovers. Exercise an actual save/reload/publish cycle, then change the draft and confirm the published authored snapshot remains unchanged.

Check externally hosted fonts loading on the actual network, browser zoom/text enlargement, Mobile orientation, and selection overlays. The automated font-ready passes use the fixture's existing font context and explicitly loaded deterministic system alternatives; they do not guarantee every remotely hosted font succeeds on every network.

No API modifications, migrations, dependencies, controls or new persisted layout settings were required.

KIRITA COUNTDOWN RESPONSIVE FIX COMPLETE
