# KIRITA Hero Phase 1 - root flow vertical distribution

Implemented 2026-10-12 (Asia/Manila). Scope: reusable normal-flow distribution for Hero root blocks. No reference design, templates, Group fill-height feature, Divider/Countdown changes, migration, dependency addition, commit or push.

## Architecture and contract

The optional property is `rootVerticalDistribution?: 'packed' | 'space-between'` on each Hero **appearance owner**:

```json
{
  "appearance": {
    "shared": {
      "headingAlignment": "inherit",
      "bodyAlignment": "inherit",
      "backgroundTreatment": "inherit",
      "emphasis": "inherit",
      "height": { "unit": "svh", "value": 100 },
      "rootVerticalDistribution": "space-between"
    }
  }
}
```

Custom owners use the same property in `appearance.custom.desktop|tablet|mobile`, paired with their existing custom composition. The selected owner remains the editing destination; Shared is not a Desktop source of truth. Customize copies the property with existing lifecycle helpers; reset restores Shared. Non-Hero appearance owners reject the property, including explicit Packed. No nested responsive property or new device picker was added.

`SectionRootFlow` accepts optional distribution and the existing packed vertical justification. `SectionChildFlowRenderer` forwards them after resolving/filtering roots. Only Hero opts in. Gallery, RSVP and Blank retain the default Packed path. API save and snapshot validators already delegate to the canonical section-appearance validator, so no parallel snapshot field list or new persistence column is necessary.

## Default and compatibility

Missing property means Packed. Explicit Packed is accepted for compatibility; inspector authoring and API normalization remove it, preserving sparse defaults. Web hydration also accepts explicit Packed. The existing foreground/cluster/root layout and content-position behavior remain unchanged in Packed mode; tested implicit versus explicit Packed geometry is identical.

Old saved layouts and old snapshots need no rewrite. Published snapshot decoding accepts the new property through existing Web and API section contracts. Draft edits remain isolated from active publication until republish; tests exercise both Shared and custom Mobile distribution.

## Height propagation, count and overflow

The shell retains its existing optional `svh` minimum height. Foreground inherits that minimum and remains border-box with authored four-sided padding. Distributed content wrapper receives:

```css
min-height: max(0px, calc(HERO_MINIMUM - TOP_PADDING - BOTTOM_PADDING));
box-sizing: border-box;
```

Its actual root flow inherits this usable minimum. There is no fixed height and no percentage-height dependency beneath min-height-only ancestors. Shell/foreground/content/root wrappers have no authored layout borders; decorative frame borders are absolute overlays and consume no layout height. Existing Group and outer-spacing padding remains inside each root's intrinsic extent. No new layout border was introduced or assumed in this arithmetic.

Direct root wrappers use `flex-shrink: 0` in distributed mode. Multiple meaningful visible roots use `justify-content: space-between`. Natural overflow expands the flow, wrapper, foreground and Hero; free space drops to zero without overlap or vertical clipping. Existing shell horizontal clipping and image-cover behavior are unchanged. Automatic height creates no extra viewport space: distribution only spreads roots when the selected Hero minimum supplies space.

- **Two or more roots:** spread over usable height; retain horizontal content alignment; vertical content position is overridden by distribution.
- **One root:** retains the saved top/center/bottom position within usable height and the saved horizontal alignment.
- **Zero roots:** no distribution slots; minimum-height Hero can remain an empty background surface.
- **Hidden/empty roots:** filtered before counting in both modes of distributed rendering. Blank Text, empty Groups, Groups with no meaningful descendants, unresolved images and other publicly non-renderable roots do not reserve distribution gaps. Empty editor blocks remain accessible/editable in Structure. Packed retains its existing editor affordances and filtering.

The filtering is local to opt-in root distribution; generic block/Group rendering was not globally changed. A decorative-only empty Group is treated as empty, rather than a root spacing device. Root spacing presets are preserved as authored padding; this phase introduces no automatic inter-root gap or spacer.

## Inspector behavior

Hero has **Vertical distribution** with **Packed** and **Space Between**. It edits the currently resolved appearance supplied by the existing inspector owner wiring.

Packed retains the nine-position control and reset. Space Between presents the same position control in horizontal-only mode with Left/Center/Right choices. Changing horizontal alignment preserves the stored vertical component. Help text explains that multiple roots use opposite vertical ends, a singleton retains its saved position, and Packed must be selected to edit vertical positioning. Vertical reset is hidden while distributed to avoid unexpectedly resetting horizontal and singleton position together.

The browser test operates the real Select keyboard handler, validates its output through full draft normalization with a custom Mobile composition, and checks Shared remains unchanged. No JSON editing is needed.

## Files changed

Web paths are relative to `C:/Users/User/source/repos/kirita/Wedding.Platform.Web`:

- `src/features/websiteEditor/types.ts`: optional owner-level property type.
- `src/features/websiteEditor/schemas.ts`: values and Hero-only validation for draft/public/snapshot section contracts.
- `src/features/websiteEditor/components/AppearancePanel.tsx`: actual Hero inspector control and guidance.
- `src/features/websiteEditor/components/ContentPositionControl.tsx`: optional horizontal-only presentation; other callers keep the existing grid.
- `src/features/websiteRenderer/rootFlowDistribution.ts`: reusable distribution type, sparse authoring and usable minimum-height calculation.
- `src/features/websiteRenderer/HeroSectionRenderer.tsx`: opt-in height propagation and distribution parameters.
- `src/features/websiteRenderer/SectionChildFlowRenderer.tsx`: meaningful-root filtering only when opted in.
- `src/features/websiteRenderer/SectionRootFlow.tsx`: normal-flow distribution, singleton justification and shrink prevention.
- `src/features/websiteRenderer/rootFlowDistribution.test.tsx`: contract, ownership, compatibility and structural coverage.
- `src/features/websiteRenderer/rootFlowDistribution.browser.test.ts`: headless Chrome measurements using actual React components and generated Tailwind stylesheet, plus actual inspector authoring.
- This document.

API paths are relative to `C:/Users/User/source/repos/kirita/Wedding.Platform.API`:

- `app/Actions/Websites/UpdateWebsiteSectionAppearance.php`: Hero-only validation and sparse Packed normalization, reused by draft save and snapshot validation.
- `tests/Feature/HeroRootVerticalDistributionTest.php`: valid/invalid payloads, other-section rejection, atomic draft save/reload, custom groups/spacing, publish/decode and isolation.

Both repositories were clean at implementation start (Web HEAD `d87a5aa`, API HEAD `4121bda`, both `develop`); existing code from the previous audit had already been committed externally. No branch switches or unrelated code changes were made. Temporary HEAD baseline-test copies were deleted after use.

## Automated verification

Tests use isolated fixture pages and SQLite in-memory API databases; no real event data was changed.

- Final isolated Web command: `npm test -- src/features/websiteRenderer/rootFlowDistribution.test.tsx src/features/websiteRenderer/rootFlowDistribution.browser.test.ts src/features/websiteRenderer/specializedSectionLayout.test.tsx src/features/websiteEditor/components/GalleryCollectionEditor.test.tsx`: **29 passed**, four files, no skips. The new distribution coverage contributes six unit/structural tests and one browser test.
- Chrome geometry/inspector test: **passed**, using actual components and generated CSS at two viewport heights (Chrome window heights 600/1000; assertions use measured inner viewport height). It measures 216 fixtures: two template keys × three container widths (320/768/1280) × editor/public × nine content/layout scenarios × two viewport heights. Scenarios include multiple/empty/single/overfull/automatic and Packed comparison. This tests shared Hero components under both template keys, not a deployed full-site template screenshot.
- API distribution tests: 4 passed, 50 assertions after adding custom snapshot checks.
- Broader related API checks: 69 passed, 453 assertions before the final three custom snapshot assertions; no failures.
- `npm run build`: **passed**, including TypeScript test-source compilation; chunk-size warning remains. `npm run lint`: **passed**. API `pint --test` for both changed PHP files: **passed**. `git diff --check` in both repositories: **passed**.
- Full `npm test`: **1,415 passed, four failed**, 134 files. Two failures are the baseline callback hook errors below. The RSVP runtime geometry test timed out at 30 seconds, and Gallery's framing/focus test failed `duplicate focus`; **both passed in the final isolated 29-test run**. Their full-run failures are not called proven pre-existing failures or proven regressions. The full suite is not green.
- Two `SectionChildFlowRenderer.test.tsx` callback tests fail because they call the hook-using component directly outside React. Reproduced the same failures using untouched HEAD component/test copies, not just inferred from unrelated filenames. Those existing tests were not modified.

The related API command included `HeroRootVerticalDistributionTest`, `WebsiteSectionAppearanceTest`, `AtomicWebsiteDraftSaveTest`, `PublishedWebsiteSnapshotTest`, `PublishedWebsiteSnapshotPersistenceTest` and `WebsiteSectionPresentationTest`. The full API suite and real multi-connection MySQL tests were not run. Synthetic inspector interaction validates the authored branch with full Web draft normalization; HTTP save/reload and publication behavior are separately covered by API tests. Manual end-to-end editor/guest acceptance remains below.

## Manual browser checks still required

Automated geometry is real Chromium layout, not static markup inference. It does not replace manual full-editor acceptance:

1. Start on Mobile, build two Groups using Structure, save Shared, customize Mobile and choose Space Between. Confirm sibling devices stay on their own owners; reload and reset to Shared.
2. Repeat on Tablet/Desktop; check full editor iframe, selected/unselected frames, nested selection/reveal and reorder/move.
3. Publish a real project and compare guest framing/typography with the same saved owner; verify changes remain draft-only until republish.
4. Review actual photograph/contrast, long names, enabled countdown units, missing/late assets and fonts. This phase does not fix Countdown fit or Divider inventory.
5. Check real mobile browser chrome/svh changes, landscape phones, 200% zoom/text, touch editing and screen readers. Confirm overfull content grows readably and labels clearly explain singleton positioning.

## Risks and limitations

- Explicit minimum height is needed to create flexible viewport space. Automatic remains content-sized.
- Distribution overrides vertical position for multiple roots; singleton uses stored vertical position. Adding/removing roots can therefore change placement predictably; UI help describes it.
- Empty distributed editor roots have Structure access but no canvas placeholder; Packed still shows existing affordances.
- No generic Group fill feature, fluid typography, new countdown layout, ornamental assets or reference-specific preset was added.
- API tests establish sequential SQLite contract/save/publication behavior, not concurrent MySQL readiness.
- Browser tests require installed Chrome and skip explicitly when it is absent. Manual deployed/editor checks listed above were not performed.
