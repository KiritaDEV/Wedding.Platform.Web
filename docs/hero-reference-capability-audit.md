# KIRITA - Hero reference capability audit

Audit date: 2026-10-11 (Asia/Manila). Read-only source investigation of the current working trees.

Web: `C:/Users/User/source/repos/kirita/Wedding.Platform.Web`, branch `develop`, HEAD `71a8bbc`. API: `C:/Users/User/source/repos/kirita/Wedding.Platform.API`, branch `develop`, HEAD `38c6c46`. Both repositories already contain extensive modified and untracked work, including composition and publishing changes. Findings describe the **working trees**, not clean HEAD or deployed behavior. Only this report was created. No application/test edits, database operations, migrations, dependency additions, branch changes, commits or pushes were performed.

Evidence notation: `W:` paths are relative to Web; `A:` paths are relative to API. Evidence entries provide precise files, lines and functions. “Verified” means source-backed. No browser, API round-trip or test suite was executed. The supplied textual description is the composition target; no screenshot or photograph was attached, so exact visual matching and subject framing cannot be measured.

## 1. Executive verdict

**Partially achievable.** Existing controls can create the photograph, countdown, ornamental divider on a supported template, wedding date, oversized serif names, venue label and two editable Groups. Hero accepts generic blocks rather than fixed wedding content. It supports full available page width and a configurable `100svh` minimum height.

The defining **independently anchored top/bottom clusters are not achievable with current controls** without the prohibited spacers, margins, offsets or absolute positioning. Hero positions its entire block flow as one cluster. The root flow is a natural-height vertical stack. Groups lack meaningful fill/minimum height and distributed justification. Two Groups therefore move together; setting their content positions to top and bottom does not anchor them to Hero edges. [E1–E4]

The smallest missing capability is **normal-flow distribution across a height-bearing container**: a reusable root-flow distribution setting such as `space-between`, plus propagation of Hero's usable minimum height to the flow that directly contains the Groups. A selector alone will fail while that flow remains content-height. No specialized Hero, new wedding template or freeform positioning canvas is necessary.

Divider support is also template-dependent: Classic Filipiniana has active ornaments; Modern Editorial has no registered Divider asset. A generic insertion candidate does not guarantee usable artwork. [E6, E8, E11]

The working tree changed externally during this audit: a final reread of `blankSectionRenderability.ts` showed a new `resolveSharedElement` import compared with the preceding read. The audit did not make that application change. Consequently these references are inspection-time evidence, not an immutable checkout snapshot; no baseline build health is claimed.

## 2. Feature capability matrix

Verdicts concern the described element through actual controls, not exact duplication of unspecified artwork.

| Element | Capability / accessible controls | Rendering | Limitations | Verdict |
|---|---|---|---|---|
| Countdown | Hero and both Group depths expose insertion. Event timing or custom date/time/time zone; days/hours/minutes/seconds switches; custom unit labels; horizontal/vertical, alignment, gap. Numbers and Labels have independent typography, color and effects. | Numbers above labels, padded non-day values; guest timer updates; editor sample. | No auto-wrap, label-hide switch or compact separator format found. Minimum character widths and large fonts can overflow. Invalid target gives editor notice and no guest timer. | **Fully supported** for a conventional countdown, with fit tuning. E5, E8 |
| Decorative divider | Artwork/style, color, percent width, alignment, opacity, shadow/glow. | Active available template artwork, intrinsic aspect ratio, tintable decoration. | Classic has ornaments; Modern has none. Unavailable artwork shows editor notice and disappears publicly. No arbitrary Divider upload. | **Partially supported** across templates; usable on Classic. E6, E11 |
| Wedding date | Authored Text with rich formatting, centered alignment, font, size, color, case and tracking. Date is also an available block but unnecessary here. | Paragraph/run document, whitespace and wrapping. | Text date does not automatically track Event timing. Rich Text is the Text editor/document, not a separate insertion type. | **Fully supported** as Text. E7, E8 |
| Couple names | Text, serif picker, sizes through 7xl, alignment, colors and effects; canvas editing. | Full available width, anywhere wrapping; size presets 0.75rem–9rem. | No fluid sizing, arbitrary size or balanced line breaking. Font/weight choices are validated and limited to supported resources. | **Fully supported**, subject to wrapping. E7 |
| Venue label | Independent small Text, center alignment, case, tracking and project color. | Same Text renderer. | Authored content, not automatic venue binding. | **Fully supported**. E7 |
| Content clusters | Root Groups or an outer Group with two nested Groups; direction, child alignment, gap, padding, width and content position. | Recursive vertical flex or horizontal fixed-track grid. | Root Group plus one nested level only. No fill height, authored min-height or space-between. | **Partially supported**: grouping yes, anchoring no. E3, E4, E8 |
| Photograph | Hero image picker, focal point, zoom, image opacity, background color and template overlay presets. | Cover crop over Hero shell behind content. | No contain switch; zoom 1–3. Independent device framing requires custom appearance ownership. Contrast needs actual-image review. | **Fully supported** for cover photography. E9, E10 |

White/cream colors can use template colors or project colors. Names/date/venue can each have separate typography and color. Nested children are validated; arbitrary font/color IDs are not legitimate merely because a renderer reads strings. [E7, E12]

## 3. Hero architecture and layout feasibility

### Storage and blocks

Hero content is `{ semantic: {}, compositions: { shared: { childFlow }, custom?: { desktop?, tablet?, mobile? } }, sharedContentDefinitions? }`. There are no specialized couple/date/venue fields. Child flow contains `elements` and explicit ordered element references; Hero must have no specialized-content reference. API checks that every root element is referenced exactly once. [E8, E12]

Hero permits Text, Date, Accordion, Schedule, People, Countdown, Divider, Media and compositionGroup. This is arbitrary composition of **registered blocks**, not unrestricted HTML, React components, every section type or unlimited nesting. API limits root elements to 20 and Group children to 20. A root Group can contain a nested Group; the latter can contain only leaves. Both proposed cluster hierarchies fit. Web schemas and final Group menus enforce the same depth. [E3, E8, E12]

### Actual layout chain

```text
Hero shell: width 100%, optional svh minimum height
  Foreground: vertical flex, inherited minimum height, padding
    ONE content-cluster wrapper: width 100%, natural height
      SectionRootFlow: vertical flex, natural height
        Group A + spacing/motion/frame wrappers
        Group B + spacing/motion/frame wrappers
```

`heroContentPositionStyle()` maps nine positions to vertical start/center/end and horizontal start/center/end. It positions the single cluster wrapper. `SectionRootFlow` has only vertical direction and inline alignment, with no height/fill/distribution setting. [E1, E2]

Group vertical mode is flex-column; horizontal mode is **grid**, with 50/50, 60/40, 40/60 or thirds tracks. Child alignment controls inline placement in vertical mode. Group content position supplies start/center/end justification, but no authored height, min-height, flex grow or stretch-to-parent-height. Its only min-height is an editor-only empty-Group affordance. Width choices are full, 72rem, 48rem and 32rem, constrained by surrounding max-width containment. Spacing presets are none/xs/s/m/l/xl = 0/0.25/0.5/1/1.5/2rem. [E3, E4]

**Top/bottom verdict:** two Groups can be authored, centered and styled independently, but cannot occupy opposite Hero edges while Hero height changes. An outer Group remains natural-height and does not solve this. Static padding/gap only creates fixed separation, not flexible free space. Horizontal grid division does not distribute rows vertically.

### Height, overflow and full bleed

Hero uses **minimum height**, not fixed height. Automatic has no authored minimum; Custom allows integer 25–150svh. `100svh` establishes at least the browser small-viewport height; content can make Hero taller. It is not a guarantee of exactly one screen. [E1, E10]

Shell is `w-full overflow-x-clip`; foreground is border-box and full width. Background spans the shell independently of foreground padding. Both current templates delegate Hero directly to the shared renderer, bypassing normal specialized decoration wrapping; their appearance helpers do not impose Hero side gutters or max-width. This supports full bleed to the **containing page width** on Desktop, Tablet and Mobile. `w-full` does not escape an externally constrained parent. Actual deployed edge-to-edge dimensions were not browser-measured. [E1, E13]

Image crop is clipped inside its image container. Foreground horizontal oversize can be clipped by Hero. There is no authored vertical clipping policy; long content generally increases height. This needs real layout checks, particularly with countdowns and oversized names.

## 4. Background image behavior

`BackgroundMediaLayer` resolves the asset ID from the response media map, uses its web variant, and renders an absolute inset-zero decorative layer. Without a resolved asset it returns no layer. `ZoomedMediaImage` measures container dimensions with ResizeObserver. Cover scale is `max(containerWidth/sourceWidth, containerHeight/sourceHeight)` multiplied by zoom. Focal point defaults to (0.5, 0.5), with clamped placement preventing uncovered edges. [E9]

There is **no Hero cover/contain selector**. Other geometry helpers do not establish Hero support: the actual Hero path uses cover geometry and zoom 1–3. Zooming out below cover is not permitted by the current background contract.

A wide centered-couple image in a portrait Mobile Hero will typically lose side context. If the couple is spread horizontally, one person may leave the crop. A portrait photograph may instead lose vertical context on Desktop. Focal point can prioritize subjects but cannot preserve everything when the visible crop is too narrow. These are algorithm-based predictions; no attached photograph was evaluated.

Background contract is `{ assetId, focalPoint?, zoom? }` in the resolved appearance owner. Helpers named `resolveBackgroundMediaForDevice`, `setBackgroundMediaDeviceFraming` and removal explicitly ignore their device argument. Device independence comes from **separate Shared/custom section appearance branches**, not a media `responsive` object. Customize Mobile/Tablet/Desktop first to configure independent framing, or even a different asset, without changing Shared. [E9, E16]

Image opacity is 0–100 and reveals the surface underneath; it is not inherently a darkening control. Hero also offers background color and template overlays: Classic none/soft/warm/deep; Modern none/soft/deep. Presets contain fixed blend/opacity styles. The actual composable Hero panel exposes Overlay choices, not an arbitrary Hero gradient or legacy overlay-strength slider. White text contrast depends on highlights, faces and crop; review the actual photograph. [E10, E11]

Media persists as asset IDs/framing, not delivery URLs. API validates Event ownership and image MIME types, and gathers references from composition/appearance branches. Publication freezes reference identity and layout; guest URLs and variants resolve at request time. Snapshot isolation does **not** freeze image bytes, fonts or renderer code. [E12, E14]

## 5. Responsive appearance and device assessment

### Ownership, inheritance and overrides

Editor starts on the detected device: Mobile below 768px, Tablet 768–1279px, Desktop from 1280px. Accessible previews are Desktop→all, Tablet→Tablet/Mobile, Mobile→Mobile. Editor iframe samples are 1280×800, 768×1024 and 390×844. Styles are copied and content is portaled into the iframe, providing its own viewport geometry; samples do not cover all real screens. [E15]

Each device resolves its exact custom composition/appearance if present, otherwise Shared. Custom is a complete copied owner, **not a live property-by-property merge** with Shared. Customize copies Shared, regenerates block IDs, strips nested responsive state and creates paired appearance. Reset removes custom and resumes Shared. Shared is not Desktop: a Mobile user may author Shared first and Desktop may itself be custom. [E16]

`authoredPropertyViewport()` returns `'desktop'` as a **base-property selector within the resolved owner**, not as the destination Desktop branch. Actual content/appearance updates use selected Shared/custom scope. Mobile custom Text/Group/Hero controls therefore write that custom owner's base. [E16]

Reusable schemas/renderers retain Tablet/Mobile override support for Text, Group and Countdown, but the actual Hero composition validator rejects non-animation authored `responsive` state, and API appearance validation rejects Hero nested responsive state. Independent authored device styling must use custom owners. Animation has specific device exceptions. Lower-level schema support is not proof of accessible legacy override authoring. [E12, E16]

Ordinary Hero Text and Countdown content is copied into custom compositions. Current shared-content definitions are Schedule-only; no generic binding for couple names/date/venue/countdown was found. Later Shared content edits must not be assumed to update custom copies. [E14, E16]

| Device | Existing capabilities | Cropping, text, spacing and overflow assessment |
|---|---|---|
| Desktop | Cover photograph, 100svh minimum, centered Groups and large serif text; edit resolved Shared/custom owner. | Wide images lose vertical context; names can wrap as Desktop narrows. Top/bottom distribution is unavailable. Confirm containing page width. |
| Tablet | Custom Tablet owner can independently adjust text sizes, Groups, spacing, height and framing. | Portrait crop loses side context. Large names add lines and increase Hero height. Horizontal Group grid does not automatically stack; change direction explicitly. |
| Mobile | Custom Mobile owner can reduce names/countdown size/gap, use vertical countdown and independent framing. | Four units have minimum widths and no wrap. Large numbers may clip; names may break mid-word through anywhere-wrap. 100svh uses small viewport, not dynamic expanded height. Short landscape and large text can exceed one screen. |

Shared edits affect all devices still using Shared. Custom Mobile edits isolate both clusters from sibling owners, but customization is whole-section granularity, not one-cluster-only ownership. Source routes preserve envelopes through save and publication; no runtime round-trip was executed.

## 6. Actual editor experience

The existing interface supports selecting Hero, adding a root Group through Structure, and adding Countdown/Divider/Text inside it. Create the second Group and names/venue Text similarly. An optional outer Group with nested clusters is within depth limits. Root menus filter the actual section capabilities; Group menus additionally filter depth. These final menus and click creation paths include the required registered blocks. [E8]

Structure has expandable Group rows, rename, duplicate/delete, visibility, up/down, drag reorder, validated cross-parent drop destinations and a Move dialog. Depth/count rules constrain destinations. Selection reveal targets element IDs, including iframe documents; canvas frames stop event propagation to select nested blocks. These are source-verified mechanisms, not exercised touch/drag/reveal outcomes. [E17]

Inspectors expose required Text, Countdown, Divider, Group and Hero controls described in the matrix. None exposes distributed justification or Group fill height. Supported elements need no JSON edits; unsupported fields cannot legitimately be added manually because strict schemas/API validators reject them. [E3–E12]

Editor selection frames, badges, Group boundaries, divider hit areas and empty placeholders differ from guests. Small ornaments and labels may become harder to judge with overlays active; clear selection and check guest mode. Countdown samples versus live timing, unavailable-art notices, empty states, motion and public renderability filters are deliberate differences. Shared renderer components do not prove pixel-identical preview/public output. [E5, E6, E17]

## 7. Web/API contract parity and publishing

- Hero default structure, allowed types, order validation and Group nesting agree for this target. Existing primitives need no structural migration. New arbitrary coordinates, fill-height or distribution fields are currently unsupported in strict contracts. [E3, E8, E12]
- Custom composition and appearance are paired by Web lifecycle and API validation. `SaveWebsiteDraft` retains omitted fields/sections; submitted content/appearance are complete envelopes. It delegates validation/persistence through the publication coordinator. Sibling branch retention must be tested through this path. [E12, E16]
- Asset references and font/color identities are validated. Divider serialization preserves expected JSON shape. Hero's normalizer returns canonical content unchanged; special obsolete-content recovery is for RSVP, not a general legacy Hero adapter. Old fixed-field Hero or nested-responsive compatibility must not be assumed. [E12]
- Snapshot builder projects saved state, branches, Event timing, presentation descriptors and media manifest. Guest presentation reads active publication pointer plus snapshot rather than mutable draft sections; filters disabled/hidden/audience content and resolves authorized delivery URLs. Reader validates stored snapshot contracts. [E14]
- Current Web/API snapshot contracts support Schedule shared definitions. Older memory saying definitions are forbidden is stale for this working tree; the current source was used. This does not synchronize ordinary Hero content. [E14]
- Layout isolation is source-backed, but migration deployment, real concurrent database behavior, existing stored snapshot compatibility and deployed endpoint behavior were not tested. Future layout fields should be optional/defaulted and preserve old packed layouts and published payloads.

## 8. Identified gaps and minimal recommendations

| Priority | Gap and root cause | Affected systems | Reusable recommendation |
|---|---|---|---|
| **P0** | No vertical distribution in a height-bearing flow; one natural-height Hero cluster. | HeroSectionRenderer, SectionRootFlow, SectionChildFlowRenderer; editor contract/inspector; API appearance/content validators; snapshot validation. E1–E4, E12 | Optional normal-flow distribution plus propagation of usable Hero minimum height to the direct flow. Use two root Groups. |
| **P1** | Modern Divider has no available artwork despite generic insertion. | Decorative registry, Divider resolver/editor/renderer, menu availability. E6, E8, E11 | Add approved reusable template ornaments or expose accurate asset-dependent availability. |
| **P1** | Countdown row has minimum unit widths and no wrap. | Countdown renderer and appearance/inspector. E5 | First tune current custom-device size/gap/units; add reusable wrap/compact layout only if readability still fails. |
| **P1** | Independent styles require whole-section copies; ordinary content diverges. | Lifecycle, ownership UI, Text/Countdown content, Schedule-only definitions. E14, E16 | Explain ownership clearly. Generic shared-content bindings are conditional follow-up if synchronized content is required, not a prerequisite here. |
| **P2** | Preset-only typography, no fluid scaling or line balancing. | Text contract, typography map, inspector. E7 | Consider bounded fluid typography after evaluating presets. |
| **P2** | Fixed overlay presets limit contrast tuning. | Hero decorative controls, overlay execution, validation. E10, E11 | Evaluate deep overlay and existing text effects first; optional reusable overlay strength only if needed. |

Preferred P0 approach: reusable vertical flow distribution (for example packed versus space-between) with existing Hero svh minimum. Preserve normal document flow, keyboard order, intrinsic text sizing and existing content blocks. Specify minimum inter-cluster gap and overfull behavior. Short viewports should allow Hero to grow rather than overlap or clip content; readable content cannot always fit one screen.

If implementing this on Group instead, add both distribution and meaningful minimum-height/fill behavior, and propagate height through spacing/motion/frame wrappers. A `space-between` selector on a natural-height Group or `height:100%` below min-height-only ancestors is insufficient. Group expansion is broader than the minimal root-flow solution.

A freeform absolute-positioning canvas is **not recommended**: normal-flow architecture can solve the target. Coordinates would add breakpoint offsets, collision handling and touch editing complexity.

## 9. Implementation sequence - not executed

1. Verify baseline code health. Define the reusable distribution contract, optional defaults, usable height propagation, minimum gap and overflow growth. Add matching Web/API and snapshot compatibility coverage. No new template or migration is presumed necessary.
2. Wire renderer and actual inspector. Prove two root Groups occupy opposite edges in both templates while preserving wrappers, selection, spacing, backgrounds and current packed layouts.
3. Verify Shared/custom ownership and real save/reload/publish behavior. Build using menus, customize active device, adjust clusters/framing and confirm sibling isolation. Include Mobile-first creation.
4. Resolve Modern Divider availability and evaluate countdown fit independently. Add wrap, fluid typography or overlay strength only where current controls measurably fail acceptance.

## 10. Verification strategy - future work

Focused automated checks:

- Actual insertion menus/click-created Hero trees and Group depth limits; invalid moves, duplicate IDs, child limits and order integrity. Relevant existing suites include SectionChildList, countdownAddAvailability, sectionChildFlow and API element/content validation.
- Shared Web/API fixtures for new fields/defaults, unknown fields, normalization and old payloads; snapshot encode/decode and sibling branch retention.
- **Browser geometry tests**, not just markup: two Group edges at multiple heights/content lengths; actual root flow usable height; minimum separation; hidden/empty clusters; maximum padding; overfull non-overlap and readable growth.
- Mobile-first Shared edit, custom Mobile/Tablet/Desktop creation, sibling isolation, reset fallback and copied names/date behavior. Verify all properties through real inspector controls.
- Draft save plus publication round-trip; layout/framing/Event timing remains frozen until republish; media manifest, missing assets, hidden/audience filtering and unauthorized references. Production concurrency requires dedicated supported-database testing, not claims from source inspection.
- Countdown invalid/Event/custom timing, expiry, enabled units, large day count, sample/live difference, long labels and font loading.

Manual checks: both templates at 1280×800, 768×1024, 390×844 plus 320px Mobile, short landscape and breakpoint resizing; real photograph with both faces; long couple names; late/failed fonts and images; 200% zoom/text; selected/unselected overlays; nested selection/reveal; mouse/touch reorder and Move dialog; no horizontal scrollbar or clipped timer; browser chrome and svh changes. Inspect DevTools Network/Console. Compare iframe preview with guest rendering of the same saved owner. Assess actual crop contrast.

## 11. Evidence index

References were read in the current working trees; line numbers may move. Function names disambiguate references.

| ID | Precise files / code references | Conclusions supported |
|---|---|---|
| E1 | W:`src/features/websiteRenderer/HeroSectionRenderer.tsx:27`, `HeroSectionRenderer`; W:`src/features/websiteRenderer/heroContentPosition.ts:12`, resolve/style functions | One cluster, padding, minimum height, bleed and packed positioning. |
| E2 | W:`src/features/websiteRenderer/SectionRootFlow.tsx:3`; W:`src/features/websiteRenderer/SectionChildFlowRenderer.tsx:25` | Natural-height stack, wrapper chain, missing distribution. |
| E3 | W:`src/features/websiteElements/schemas.ts:359–393`; W:`src/features/websiteElements/group.ts`, `resolveGroupLayout`; A:`app/Website/Elements/CompositionGroupValidator.php:15`; A:`app/Website/Elements/WebsiteElementValidator.php:65`, `validateAtDepth` | Layout fields, nesting, validation and limits. |
| E4 | W:`src/features/websiteRenderer/GroupElementRenderer.tsx:27`; W:`src/features/websiteEditor/components/GroupElementEditor.tsx:90`; W:`src/features/websiteElements/spacing.ts:1` | Flex/grid, width, spacing, inspector and absent fill height. |
| E5 | W:`src/features/websiteRenderer/CountdownElementRenderer.tsx:21`; W:`src/features/websiteEditor/components/CountdownElementEditor.tsx:51–103`; W:`src/features/websiteElements/countdown.ts` | Countdown controls, sample/live timing, roles and nowrap risk. |
| E6 | W:`src/features/websiteElements/divider.ts:20`, asset resolution; W:`src/features/websiteRenderer/DividerElementRenderer.tsx:18`; W:`src/features/websiteEditor/components/DividerElementEditor.tsx:85` | Artwork dependency, size/alignment/color, unavailable rendering. |
| E7 | W:`src/features/websiteRenderer/TextElementRenderer.tsx:18`; W:`src/features/websiteRenderer/elementTypography.ts:1`; W:`src/features/websiteElements/textAppearanceContract.ts:3`; W:`src/features/websiteEditor/components/TextElementEditor.tsx:135`; W:`src/features/websiteFonts/platformFonts.ts:15` | Typography, serif fonts, wrapping, rich text and colors. |
| E8 | W:`src/features/websiteEditor/schemas.ts:87`; W:`src/features/websiteEditor/components/rootAddElementItems.ts:4`; W:`src/features/websiteEditor/components/SectionNavigator.tsx:226`, `addGeneric`; W:`src/features/websiteEditor/components/SectionChildList.tsx:943`; W:`src/features/websiteEditor/components/sectionChildListHelpers.ts:34`; A:`app/Website/Capabilities/WebsiteCapabilityResolver.php:484`; A:`app/Website/WebsiteSectionRegistry.php:13` | Hero content and actual capability-filtered insertion paths. |
| E9 | W:`src/features/websiteMedia/backgroundMedia.ts:31`, schema/resolve/set/remove; W:`src/features/websiteRenderer/BackgroundMediaLayer.tsx:5`; W:`src/features/websiteRenderer/ZoomedMediaImage.tsx:6`; W:`src/features/websiteElements/mediaCrop.ts:76`, crop geometry; W:`src/features/websiteEditor/components/BackgroundMediaEditor.tsx:10`; A:`app/Website/BackgroundMedia.php:12` | Cover, focal point, zoom, persistence contract and ignored device argument. |
| E10 | W:`src/features/websiteEditor/components/AppearancePanel.tsx:211`, `HeroSurfaceControls` and decorative controls; W:`src/features/websiteEditor/heroMinimumHeight.ts`; W:`src/features/websiteEditor/schemas.ts:237`; A:`app/Actions/Websites/UpdateWebsiteSectionAppearance.php:255–298` | Actual Hero controls, height bounds and image appearance. |
| E11 | W:`src/features/websiteRenderer/templateDecorativeAssets.ts:125–128`, Modern registry at 230 onward; W:`src/features/websiteRenderer/SectionDecorativeLayers.tsx:14–19`; A:`app/Website/Capabilities/WebsiteCapabilityResolver.php:522–530` | Classic ornaments, absent Modern Divider, overlay presets. |
| E12 | A:`app/Website/WebsiteSectionContentValidator.php:24`, responsive assertion at 203 and `heroRules` at 291; A:`app/Website/Elements/SectionChildFlowValidator.php:19`; A:`app/Actions/Websites/UpdateWebsiteSectionContent.php:27`; A:`app/Actions/Websites/UpdateWebsiteSectionAppearance.php:41–72,209–245`; A:`app/Actions/Websites/SaveWebsiteDraft.php:16`; A:`app/Website/WebsiteSectionContentNormalizer.php:19`; W:`src/features/websiteEditor/schemas.ts:414` | Contract parity, validation, media checks, pairing, save and legacy limits. |
| E13 | W:`src/features/websiteRenderer/WebsiteRenderer.tsx:23`; W:`src/features/websiteRenderer/templates/ClassicFilipinianaRenderer.tsx`, section dispatch; W:`src/features/websiteRenderer/templates/ModernEditorialRenderer.tsx`, section dispatch; W:`src/features/websiteRenderer/templates/classicFilipiniana/appearance.ts:27`; W:`src/features/websiteRenderer/templates/modernEditorial/appearance.ts:27` | Shared Hero delegation, surface styling and runtime viewport. |
| E14 | A:`app/Website/Publishing/PublishedWebsiteSnapshotBuilder.php`, build/project; A:`app/Website/Publishing/PublishedWebsiteSnapshotReader.php:33`, decode; A:`app/Website/Publishing/PublishedWebsitePresentation.php:23`, resolve/website; A:`app/Http/Controllers/PublicEventSiteController.php:16`; W:`src/features/websitePublishing/snapshot.ts:8`; A:`app/Website/WebsiteSectionMediaReferenceExtractor.php`; A:`app/Website/SharedContent.php` | Snapshot isolation, media delivery, Schedule-only shared definitions. |
| E15 | W:`src/features/websiteEditor/responsiveViewport.ts:3`; W:`src/pages/workspace/WebsitePage.tsx:279`, initial device; `PreviewViewport` at 2372, iframe at 2397 | Detected-device editing and iframe preview samples. |
| E16 | W:`src/features/websiteEditor/sectionComposition.ts:35`; W:`src/features/websiteEditor/sectionAppearance.ts:5`; W:`src/features/websiteEditor/editorComposition.ts:16–34`; W:`src/features/websiteEditor/compositionLifecycle.ts:18`; W:`src/features/websiteEditor/components/SectionCompositionControls.tsx:45`; W:`src/pages/workspace/WebsitePage.tsx:2499–2505,2774–3007` | Owner resolution, copying/reset, base-property wiring and device independence. |
| E17 | W:`src/features/websiteEditor/components/SectionChildList.tsx:148`, dragEnd/Move/nested rows; W:`src/features/websiteEditor/canvasReveal.ts:26`; W:`src/pages/workspace/WebsitePage.tsx:2137`; W:`src/features/websiteRenderer/WebsiteElementFrame.tsx:30`; W:`src/features/websiteRenderer/EditorSelectionFrame.tsx` | Selection, reveal, nesting, reordering and editor-only overlays. |

### Verification boundary

The P0 layout blocker is proven by actual contracts and the renderer hierarchy. Crop/wrap risks are predictions from algorithms. This audit does not establish passing tests, deployed functionality, database readiness, image availability over HTTP, accessible contrast or pixel-identical editor/guest output. Recommended phases and tests were not executed.
