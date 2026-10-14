# Swatches Block architecture audit

Audit date: 2026-10-14. Scope: current Web checkout and sibling `Wedding.Platform.API`; source inspection only. Both repositories were clean at the initial status check. Only this report is created. No application/test changes, migrations, database writes, dependencies, commits, or pushes. No runtime or browser checks were performed; proposed behavior below is not a verified implementation.

## 1. Executive verdict

**Yes: the architecture can support Swatches cleanly as a generic leaf element.** Store its palette inside the owning composition, render it through the existing editor/public leaf dispatcher, and use existing Group, selection, spacing, motion, draft, and publication boundaries. No new Section, template, shared-content definition, database table, or event-specific behavior is needed.

This is not a renderer-only addition. The current element registry is distributed across explicit type lists, Zod unions, PHP enum/matches, creation helpers, menus, inspector selection, capability allowlists, and render dispatch. Missing one can make insertion succeed while save, reload, duplication, or publishing fails.

Important findings:

- Hero and Blank support generic-only flows. Groups allow a root Group plus one nested Group, with at most 20 children per Group. Preserve these limits.
- Gallery and RSVP have compositional slots, but narrower recursive type restrictions. Composition support does **not** authorize every generic type. Recommend Hero/Blank only initially; enabling Swatches elsewhere requires an explicit capability and matching validator/menu change.
- Shared is an owner, not Desktop. Custom Desktop/Tablet/Mobile branches replace Shared for that target; they are not patches merged into Shared.
- `WebsiteColorSwatchControl` is coupled to template/project color IDs and `onAddColor`. Reuse the underlying `ColorPicker`, not that persistence behavior.
- Web identity regeneration handles each collection type explicitly. API regeneration already handles generic `items`, but its tree uniqueness traversal currently includes Media items rather than every `items` collection. Swatches requires deliberate parity.
- PHP associative decoding loses `{}` versus `[]`. Request validation, serialization, and snapshot reading all need Swatches shape coverage.

## 2. Recommended MVP feature set

| Capability | Recommendation |
| --- | --- |
| Collection | 1–12 colors; ordered `items`; stable item IDs; duplicate colors allowed |
| Creation | One opaque neutral color (`#808080`), no label; avoid a wedding-specific preset |
| Authoring | Add Color, hex picker/input, optional Label, Remove, Move Up/Down |
| Shape | `circle`, `roundedSquare`, `square`; default circle |
| Size | `small`, `medium`, `large`; suggested nominal diameters 32/48/64 px; default medium |
| Gaps | Horizontal and vertical presets using existing spacing tokens; default `m` for both |
| Alignment | `start`, `center`, `end`; default center; block remains container-width |
| Responsive behavior | Always horizontal with wrapping; no direction/grid/column-count/wrap toggle |
| Captions | Show Labels default true; Show Hex Values default false; absent labels produce no empty caption |
| Typography | One shared caption style: existing font picker, friendly weight, size, line/letter spacing helpers; bounded sizes `xs`, `s`, `m`; default system font, 400, `s`, normal spacing |
| Generic settings | Existing editor name, visibility, outer spacing, and block-level animation |

Minimum one avoids an invisible saved block and simplifies removal: disable Remove on the last item and explain why. Maximum twelve is a product recommendation, not an existing architecture limit; it bounds inspector length and excessive vertical growth. Repeated hex values are valid because item identity and order carry meaning; do not inherit the project library's value deduplication rule.

Defer alpha, gradients, theme references, per-item typography, per-item visibility/motion, links, copy-to-clipboard, drag-only ordering, arbitrary dimensions, text effects, and general layout controls.

## 3. Proposed canonical data contract

Illustrative canonical element, not code added to either application:

```json
{
  "id": "swatches-example",
  "type": "swatches",
  "editorName": "Swatches 1",
  "items": [
    { "id": "swatch-example-1", "color": "#334155", "label": "Slate" },
    { "id": "swatch-example-2", "color": "#F8FAFC" }
  ],
  "appearance": {
    "shape": "circle",
    "size": "medium",
    "columnGap": "m",
    "rowGap": "m",
    "alignment": "center",
    "showLabels": true,
    "showHex": false,
    "captionTypography": {
      "fontSize": "s",
      "fontWeight": 400
    }
  }
}
```

Contract rules:

- Required: element `id`, discriminator, `editorName`, and `items`. Optional: `isHidden`, `appearance`. Use the existing element ID contract: trimmed, nonblank string, maximum 255; existing Web semantic ID generation and API ULID regeneration are both valid. Do not suddenly require every element/item ID to be a ULID.
- `items` must be a JSON list of 1–12 JSON objects. Only `id`, `color`, and optional `label` are allowed. Array order is display order; no item `sortOrder`, separate order map, or item type discriminator is needed.
- IDs survive edit and reorder. Add creates a fresh ID. Duplicate block, duplicate Group/Section, and custom-owner creation regenerate the block and all item IDs. Copy retains color values, labels, order, and appearance.
- Require owned IDs to be unique throughout the Section's Shared and custom composition trees, including collisions with element IDs. The Web composition refinement already visits `items`; extend the API traversal specifically for Swatches and add local item uniqueness in both element validators. Existing generic Web tree refinement visits children but does not itself visit item IDs, so do not rely on it alone.
- `label`: optional plain text, trim surrounding whitespace, count at most 80 Unicode code points, reject `<`/`>` consistently with Countdown's plain-label precedent; omit blank labels. Reject null/nonstrings. Escape through normal React text rendering. Do not collapse meaningful internal spacing without a product reason.
- `color`: exactly `#[0-9A-Fa-f]{6}`, normalize to uppercase. No implicit whitespace trimming, missing `#`, shorthand, eight-digit hex, CSS names/functions, variables, or reference IDs. This matches the existing opaque color picker/schema convention. Invalid input must fail validation, not be silently dropped or replaced.
- Allow duplicate normalized colors; reject duplicate normalized IDs. These are separate checks.
- `appearance` and `captionTypography` must be objects, including valid empty `{}`. Reject lists, unknown properties, nulls, numeric strings, and coerced booleans. Accept omitted appearance as defaults; normalize empty/default-only objects to omission for sparse persistence.
- Appearance allowlist: `shape`, `size`, `columnGap`, `rowGap`, `alignment`, `showLabels`, `showHex`, `captionTypography`, plus existing `outerSpacing` and `animation`. No `responsive` property in the new Swatches schema. Existing animation-only responsive exceptions elsewhere are not a reason to add a new nested owner mechanism.
- Gaps reuse `none|xs|s|m|l|xl`; spacing/animation use their existing strict contracts. Typography allowlist: `fontFamilyId`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`; validate registered fonts and supported family/weight tuples. Use literal/system defaults, not a template preset. No caption `colorId` or palette reference.
- Use one shared Web/PHP fixture set for normalization and invalid input. The existing `opaqueHexColorSchema` is in the editor schema module; importing that module back into element schemas risks a dependency cycle. Place a small reusable opaque-hex primitive in a lower-level module if needed. On API reuse/extract the `ProjectColorLibrary::normalizeValue` rule, **not** its collection filtering/ID rules.

## 4. Architecture integration points and affected files

Paths below are relative to each repository root; line anchors and symbols refer to the audited checkout. These are future integration points, not changes made by this audit.

| Concern | Web source | API source / impact |
| --- | --- | --- |
| Type vocabulary / registry | `src/features/websiteElements/constants.ts:1`; `blockIdentity.ts:3`; `types.ts`; capability schemas consume `WEBSITE_ELEMENT_TYPES` | `app/Website/Elements/WebsiteElementType.php:5`; `Capabilities/WebsiteCapabilityResolver.php:306` enumerates cases into descriptors |
| Schema / defaults | `websiteElements/schemas.ts:342` leaf union, `:390` Group leaf union; proposed `websiteElements/swatches.ts` for defaults/operations | `Elements/WebsiteElementValidator.php:65` name normalization and depth, `:100` leaf validation, `:148` Countdown match precedent; proposed focused Swatches rules/helper |
| Root insert / create | `websiteEditor/components/rootAddElementItems.ts:4`; `websiteEditor/sectionChildFlow.ts:167` creation dispatcher, automatic names, root references | `WebsiteSectionContentValidator.php:66` fallback allowed types; `Elements/SectionChildFlowValidator.php:20` validates root allowed types and references |
| Nested insert | `components/sectionChildListHelpers.ts:39` Group add kinds/depth; `components/SectionChildList.tsx` filters Group menu against allowed types | `Elements/CompositionGroupValidator.php:66` child allowlist; preserve two-level depth limit in `WebsiteElementValidator.php:74` |
| Capability gating | `websiteCapabilities/lookup.ts`; `websiteEditor/sectionChildFlow.ts:45` generic allowlists, `:57` Gallery, `:67` RSVP | `Capabilities/WebsiteCapabilityResolver.php:483` section allowlists; `WebsiteSectionContentValidator.php:79` recursive Gallery/RSVP restrictions |
| IDs / duplication | `sectionChildFlow.ts:272` root duplication, `:422` identity regeneration, `:436` custom composition identities; `components/sectionChildListHelpers.ts` Group duplication; `websiteEditor/schemas.ts:61` cross-owner identity refinement | `Elements/WebsiteElementIdentityRegenerator.php` recursively regenerates elements and generic `items`; `CompositionGroupValidator.php:79` uniqueness; `Actions/Websites/DuplicateWebsiteSection.php` uses regenerator |
| Inspector registration | `src/pages/workspace/WebsitePage.tsx:2529` selected Countdown and `:2774` inspector branch; proposed `components/SwatchesElementEditor.tsx` | No new endpoint: full element edits remain in existing Section content envelope |
| Render / frame | `websiteRenderer/WebsiteLeafElementRenderer.tsx:18`; proposed `SwatchesElementRenderer.tsx`; `WebsiteElementFrame.tsx:28` width classification; `elementRenderability.ts:11` hidden/public checks | `Publishing/PublishedWebsitePresentation.php:80` recursively strips hidden elements; otherwise preserves ordinary leaf data |
| Flow / width / spacing | `SectionChildFlowRenderer.tsx:50`; `GroupElementRenderer.tsx:25`; `sectionChildWidth.ts:4`; `OuterSpacingWrapper.tsx`; `websiteElements/spacing.ts:1` | `Elements/FourSidedSpacing.php`; existing extraction/restoration through element validator |
| Animation | `websiteAnimation/contract.ts`, `resolve.ts:22`, `runtime.tsx`; existing parent `WebsiteMotion` | `app/Website/WebsiteAnimation.php`; validator extracts/restores generic animation |
| Typography / font loading | `websiteElements/text.ts`, `textAppearance.ts`, `textAppearanceContract.ts`; `websiteFonts/platformFonts.ts:43` font collection and `fontLoader.ts` | `app/Website/Capabilities/PlatformFontRegistry.php`; element font tuple validation; Section content resource validation must include chosen Swatches typography path |
| Owner resolution | `sectionComposition.ts:25`; `editorComposition.ts:16`; `compositionLifecycle.ts:16` cloning | `WebsiteSectionCompositions.php:13`; `WebsiteSectionContentValidator.php:56` visits all branches and `:201` rejects authored responsive state |
| Save / hydration | `websiteEditor/draftSave.ts`, `useWebsiteDraft.ts`, `api.ts`; `schemas.ts:569` draft and `:581` public hydration; `schema.ts` | `Http/Requests/SaveWebsiteDraftRequest.php:53` delegates raw content checks; `UpdateWebsiteSectionContentRequest.php:21`; `Actions/Websites/SaveWebsiteDraft.php:13`; `UpdateWebsiteSectionContent.php`; `WebsiteDraftNormalizer.php:63` |
| JSON object preservation | Zod strict objects/list schemas | `Http/Resources/WebsiteSectionResource.php:143`; `Elements/DividerJsonShape.php:12` recursive serializer currently handles Divider/Media; extend narrowly for Swatches or use a focused helper in this seam |
| Publish / snapshot | Same renderer and public hydration; `WebsiteRenderer.tsx:27` collects fonts | `Publishing/PublishedWebsiteDraftValidator.php:63`; `PublishedWebsiteSnapshotBuilder.php:49`; `PublishedWebsiteSnapshotReader.php:118` raw shape traversal and `:173` draft validation; `:211` descriptor shape comparison |
| Assets | Swatches has no media/template SVG reference; no picker/media map required | `WebsiteSectionMediaReferenceExtractor.php:30` only recognizes asset-bearing types and recurses Groups; no new asset rule needed |
| Templates / guests | `templates/ClassicFilipinianaRenderer.tsx`, `ModernEditorialRenderer.tsx`, both template `sections.tsx`; `HeroSectionRenderer.tsx`, `BlankSectionRenderer.tsx` share flow renderer | `Http/Controllers/PublicEventSiteController.php`; `PrivateInvitationController.php`; `Publishing/PublishedWebsitePresentation.php:18` resolves saved snapshot for public/private presentation |

Smallest clean pattern: follow Countdown/Divider's generic leaf registration, Media/Accordion's ordered items and identity handling, and the common frame/flow wrappers. Do not copy Countdown timing or Media asset behavior. Group is containment, not the palette's internal layout engine. Text helpers supply typography mechanics without importing its theme color-reference semantics.

## 5. Existing controls that can be reused

- `src/components/ui/ColorPicker.tsx:7`: direct opaque hex `value/onChange`, saturation/brightness arrows, native hue range, labeled hex input; no alpha support. Its invalid temporary text currently reverts on blur, so add a clear block-specific validation message if this is otherwise confusing.
- `components/ui/Input.tsx`, `Button.tsx`, existing switches, `websiteEditor/components/InspectorPrimitives.tsx` and `InspectorVisualChoice.tsx`: row fields, toggles, simple choices, grouped appearance controls.
- `websiteEditor/components/FontPicker.tsx`, `fontSizeOptions.ts`, `websiteElements/text.ts` family/weight helpers and `textAppearance.ts`: reuse a bounded caption subset, not the complete Text editor.
- `FourSidedSpacingControl.tsx` and `AnimationAppearanceControls.tsx`: existing generic block controls. Gap controls reuse spacing tokens rather than repurposing outer spacing.
- `WebsiteColorSwatchControl.tsx:9` and `websiteColorSwatches.ts` provide useful visual/focus/Cancel precedents, but their choices produce references and Add invokes project library persistence. A new literal-color row/popover is required; do not call `onAddColor` or create `project-color-*` records.
- `sectionChildListHelpers.ts` and `StructureActionMenu.tsx` demonstrate move/delete/duplicate conventions. Palette rows need small array operations; root `childFlow.order` is for blocks, not colors inside a block.
- `colorPreview.ts` / `ColorPreviewProvider.tsx` can support optional transient preview with an `elementId:itemId:color` target. Commit literal values to the resolved owner and Cancel must restore persisted output. Immediate picker edits are simpler for MVP; settle the interaction before wiring preview sessions.

## 6. Missing capabilities / focused additions

There is no registered Swatches type, literal palette inspector, or palette renderer today. Add those, bounded collection helpers, local uniqueness/hex/label validation, and matching registrations. Extend Web duplication and API cross-owner item-ID checking. Include caption fonts in required-font traversal through nested Groups and all owners.

Add Swatches to `WebsiteElementFrame`'s full-width set so it measures available width consistently in editor/public modes. `sectionChildWidth` already defaults non-Text/Date elements to container width; no global width policy change is needed. Keep alignment local to the collection's `justify-content`, with the existing inline alignment boundary respected.

API raw JSON validation and snapshot raw-shape validation must distinguish list items from objects before associative decode erases that distinction. If normalization omits empty appearance/typography, prove serialization preserves that omission on every route; otherwise explicitly serialize empty objects. Avoid unrelated refactoring of existing element serialization.

## 7. Responsive ownership, layout, and accessibility

### Ownership

Resolve the Section owner first with `resolveEditorCompositionTarget`. Update only its `childFlow` using `updateSectionElement` and the scoped replacement path already used in `WebsitePage`. The historical `authoredPropertyViewport()` return value `desktop` means the **base property slot inside the resolved owner**, not that Shared equals Desktop.

After authoring Shared, creating custom Mobile clones the complete Shared composition and paired appearance and regenerates owned IDs. Swatches colors, labels, order, and appearance become independent Mobile values. Subsequent Shared edits affect devices still resolving Shared; they do not propagate into custom Mobile. Mobile edits affect Mobile only. Removing custom Mobile restores current Shared. A Mobile preview without custom Mobile still edits Shared. Do not introduce Schedule-like shared `contentId` definitions for this local palette.

Existing owner selection uses viewport categories; internal Swatches wrapping must use actual allocated width through CSS, never user-agent detection or phone-specific hardcoded rows. Keep those two responsibilities separate.

### Layout

Use a container-width semantic list with `display:flex`, row direction, `flex-wrap:wrap`, separate row/column gaps, and start/center/end justification. Each list item contains one shape and its own caption stack. Shape geometry uses equal inline/block dimensions and border-box sizing; circle radius 50%, rounded square a modest fixed radius, square zero radius. Labels/codes sit below the color, never over it.

Constrain item widths to the available container, allow captions to wrap (`overflow-wrap:anywhere` for long labels), and preserve aspect ratio. Nominal size should shrink uniformly only when even a single item cannot fit its allocated content box. Item width must account for captions, not rely on unbounded max-content text. Hex can wrap only at extreme containment widths; keep ordinary six-digit codes intact when they fit. No fixed height, absolute placement, nowrap collection, horizontal scroller, or overflow-hiding workaround.

Group horizontal layouts are `minmax(0,...)` grid tracks; vertical Groups wrap children in full-width flex placement. Group width caps, padding, gaps, outer spacing, Section inset, and selection/motion wrappers all reduce useful width. The existing Group wrappers also inherit `overflow-wrap:anywhere`; set shape geometry explicitly so text rules cannot distort it.

Hero uses a minimum-height shell, packed or space-between root distribution, and an `overflow-x-clip` shell. Swatches must add natural vertical height in normal flow; clipping at the Hero shell is not proof of successful containment. Distributed roots already resist shrinking. Reuse `SectionRootFlow`, `OuterSpacingWrapper`, `WebsiteMotion`, and `WebsiteElementFrame`; no Hero distribution change is needed.

For pathological authoring where padding consumes the entire content box, a visible intact shape is mathematically impossible. Define supported settings around a positive available width; test the narrowest supported width. Do not claim guarantees for zero-width containers or conceal existing Group layout problems inside this block.

### Accessibility

- Render a `<ul aria-label="Event color palette">` with `<li>` entries (localized label); no guest button, link, slider, radio, focus stop, tooltip-only name, or copy action.
- Each item exposes its supplied label and hex description even when visual label/code toggles are off. Use one accessible text representation, with hidden text where needed; mark the decorative color shape `aria-hidden` to avoid duplicate announcements. Without a label, announce the hex value; do not invent color names from RGB.
- Put captions on a predictable neutral surface with a fixed high-contrast foreground (for example dark text on white), independent of the palette and Theme. Transparent caption backgrounds cannot guarantee contrast against arbitrary Hero images. Product approval is needed for this surface treatment. Verify at least 4.5:1 for normal caption text.
- Give shapes a subtle fixed outline/inset boundary so white and near-black colors remain distinguishable on light/dark backgrounds. Keep the stored fill literal; never change palette values to increase contrast.
- Label inspector inputs, give row actions names that identify the item, disable boundary moves and last-item removal, keep focus after add/remove/reorder, and announce reorder results through a polite live region. Move Up/Down buttons are mandatory; drag-and-drop is unnecessary.
- Keyboard-test the picker, hex entry, toggles, and all row actions. Existing picker keyboard handlers are source evidence, not a completed accessibility audit. Respect existing reduced-motion behavior for block animation. Palette alone must not encode essential instructions.

## 8. Web/API compatibility and publishing impact

`WebsiteSection` stores `content`/`appearance` as array-cast JSON. `SaveWebsiteDraft` accepts full submitted content envelopes while omitted fields are retained; validation runs through existing Section updates and revision boundary. A registered leaf fits those structures without migrations or new endpoints.

`WebsiteSectionContentNormalizer` passes composition-bearing content through; avoid adding Swatches to historical Sections automatically. Web draft/public schemas must accept the new leaf through both root and nested unions. Valid historical content without Swatches must parse and render identically. Do not change existing defaults, limits, or element normalization as a side effect.

Publishing validates saved content, builds a frozen snapshot from normalized draft state/resources, and guest presentation reads that snapshot. Palette changes must not appear on guests until publication. Hidden Swatches are removed through the existing recursive presentation visibility pass. Public/private audiences need no new authorization behavior or media access. Literal values survive theme changes and project library deletion without resolution.

Current website schema version is **5** (`app/Website/WebsiteSchema.php:11`). An additive optional element type does not structurally require a version bump. Recommend retaining v5, subject to historical fixtures and deployment compatibility checks: the snapshot reader currently only accepts the current version, so a casual bump would break old snapshots rather than solve compatibility.

The reader compares frozen presentation descriptor **shape** against current prototypes; it matches each existing descriptor-list entry against current examples rather than requiring equal list lengths (`PublishedWebsiteSnapshotReader.php:211`). An added element capability should therefore be compatible if existing descriptor object shapes stay unchanged. This is a source-derived expectation, not proof: preserve pre-change snapshots for both templates and test decoding after registration. Never regenerate, rewrite, or republish historical snapshots automatically, or substitute current theme/font values for frozen metadata.

Deploy API acceptance/reading and Web decoding/rendering in a coordinated release before allowing creation. Older clients cannot be assumed to understand `swatches`; they may reject the draft/snapshot in strict hydration, and the old leaf dispatcher would omit unsupported public content. No silent unknown-type fallback should mask an incomplete deployment.

## 9. Implementation phases

1. Approve bounds/defaults, duplicate-color policy, caption surface/typography, and Section scope. Capture pre-change snapshot fixtures for both templates.
2. Define shared contract fixtures; add Web type/schema/default/collection helpers and API enum/rules/normalization, strict JSON shapes, ID traversal, and serializer handling. Prove existing snapshot/draft compatibility.
3. Register Hero/Blank capability, root/Group creation and menus, identity regeneration, selection/inspector branch, and owner-scoped mutation. Reuse existing generic spacing, visibility, and animation controls.
4. Add the literal color inspector and shared editor/public renderer, full-width frame classification, accessible captions, and caption font collection. Keep templates unchanged unless a concrete integration test exposes a necessary dispatcher seam.
5. Verify save/reload, duplicate/custom-owner behavior, publish/public/private snapshots, keyboard accessibility, and real browser geometry. Release creation only when both applications support the type.

## 10. Automated and manual verification strategy

No tests were run for this read-only audit. Existing test names below are precedents, not claims that Swatches is covered.

| Layer | Required focused checks | Existing locations / precedents |
| --- | --- | --- |
| Pure contract | 1 and 12 items valid; 0/13 rejected; malformed objects/lists/nulls; unknown fields; wrong discriminator; missing/blank/overlong IDs; duplicate IDs after trim; collisions across branches; duplicate colors allowed; lowercase hex uppercases; shorthand/alpha/CSS/whitespace invalid; optional/blank/Unicode labels; strict booleans/enums/font tuples | Web `websiteElements/media.test.tsx`, `countdown.test.ts`, `divider.test.ts`, `fixtures/divider-contract.json`; API `tests/Unit/WebsiteElementValidatorTest.php`, `DividerContractTest.php`, `CompositionGroupValidatorTest.php` |
| Inspector / operations | Add/edit/remove/reorder preserve IDs; boundary actions disabled; labels and visibility; picker commit/Cancel if used; focus/live announcements; color edits make no project-color API call | Web `components/CountdownElementEditor.test.tsx`, `MediaElementEditor.tsx` patterns, `ColorPicker.test.tsx`, `rootAddElementItems.ts`, `countdownAddAvailability.test.tsx`; proposed `SwatchesElementEditor.test.tsx` and `swatches.test.ts` |
| Identity / nesting | Block, Group and Section copy regenerate all IDs; array order and values retained; valid two-level Groups; third-level Group rejected; per-container limits; disallowed Section cannot bypass gating by nesting | Web `sectionChildFlow.test.ts`, `components/SectionChildList.test.tsx`, `group.test.tsx`; API `CompositionGroupValidatorTest.php`, `WebsiteSectionLifecycleTest.php`, `WebsiteCapabilityRegistryTest.php` |
| Ownership | Shared used on every target absent custom; Mobile customization clones and rekeys; custom Desktop is separate from Shared; editing either branch leaves the other unchanged; removing custom returns current Shared; no nested responsive state | Web `compositionLifecycle.test.ts`, `compositionIsolation.test.ts`, `editorComposition.test.ts`, `sectionComposition.test.ts`; API `ResponsiveSectionCompositionTest.php` |
| Persistence | Root/nested payload save and reload normalized values; PATCH retains omitted branches; revision/atomic behavior unchanged; raw `{}` versus `[]` coverage through direct content update and draft-save endpoint | Web `draftSave.test.ts`, `api.test.ts`, `dividerApiHydration.test.ts`; API `WebsiteDraftApiTest.php`, `AtomicWebsiteDraftSaveTest.php`, `DividerDraftApiTest.php`; proposed Swatches draft contract test |
| Publish / guests | Draft palette changes do not change saved snapshot; publication captures exact values/order/appearance; decoding rejects malformed Swatches; hidden block/Group suppression; no added media IDs; public/private presentation parity; historical fixtures decode unchanged | API `PublishedWebsiteSnapshotTest.php`, `PublishedWebsiteSnapshotPersistenceTest.php`, `AtomicWebsitePublicationTest.php`, `PublicEventSiteTest.php`, `PrivateInvitationSiteTest.php`; Web public hydration and renderer tests |
| Render semantics | List/name/caption associations; no guest interactivity; missing labels; all label/code visibility combinations; labels escaped; low/high luminance colors; both templates and editor/public parity | Proposed `SwatchesElementRenderer.test.tsx`; existing `CountdownElementRenderer.test.tsx`, `groupAlignmentBoundary.test.tsx`, `rootFlowDistribution.test.tsx` |

**Actual Chrome geometry is necessary** for wrapping, intact circles/squares, long caption containment, no overlap/clipping/scrollbar, natural height growth, Hero packed/space-between distribution, Group grid tracks/padding, outer spacing, and editor wrapper parity. DOM/SSR assertions cannot prove those outcomes.

Use the repository's existing Chrome harness style in `countdownResponsive.browser.test.ts` and `rootFlowDistribution.browser.test.ts`, adding a focused Swatches browser test without new dependencies. Cover both `classic-filipiniana-v1` and `modern-editorial-v1`, Hero/Blank, root/two-level Groups, editor/public, Shared/custom, widths 320/390/768/1280, and a much narrower allocated Group track. Include 1/12 items, all shapes/sizes, zero/largest gaps, each alignment, long spaced/unbroken labels, hex-only/no captions, loaded fonts, light/dark backgrounds, and wrapped rows under Hero distribution.

Measure each item's/shape's/caption's bounding rectangle, equal shape sides/aspect ratio, containment against the actual content box, pairwise overlap, row changes, total height, and scrollWidth/clientWidth. Inspect text Range rectangles when wrapping could still escape an item. Assert success was not merely caused by Hero `overflow-x-clip`; verify the child geometry directly. Wait for fonts before measuring. Run geometry suites serially and record skipped Chrome cases explicitly.

Manual final pass: keyboard-only insert and palette editing, screen-reader announcement, zoom/text enlargement, narrow canvas and published pages, public/private guest routes, Save→reload→publish, both templates, and DevTools Network/Console. Verify no project-color request, missing font asset, or runtime error. After implementation run focused Vitest/PHP tests, TypeScript/build/lint appropriate to changed files, and `git diff --check`; report focused results separately from any unrelated full-suite baseline failures. Any write-capable future tests must use isolated test storage/database.

## 11. Source reference boundaries

The table in §4 identifies exact paths and key symbols/lines. Additional source anchors: Web `websiteEditor/schemas.ts:21` opaque hex and `:421` responsive rejection; `websiteElements/spacing.ts:4` spacing CSS values; `ColorPicker.tsx:30` keyboard slider; `WebsiteElementFrame.tsx:28` width decision; API `ProjectColorLibrary.php:15` normalization and `:39` collection filtering; `PublishedWebsitePresentation.php:80` visibility; `WebsiteSectionResource.php:151` recursive serialization.

Inspected comparison blocks: Text (`text.ts`, schemas, editor, renderer), Divider (`divider.ts`, schemas, editor, renderer, API rules/JSON serializer), Countdown (schema/defaults, inspector, renderer, owner/geometry precedents), Media (collection schema/editor/renderer, duplication, PHP rules and raw JSON checks), and Group (nested schema/editor/menu/renderer and PHP depth/identity validation). Audit conclusions describe current source behavior. No existing live site, stored database record, old production snapshot, or real geometry was used as proof.

## 12. Open decisions requiring product approval

1. Approve 1–12 items and disabling last-item removal, versus allowing an intentionally empty saved block.
2. Approve duplicate color values (recommended) with unique IDs, rather than conflating color equality with identity.
3. Approve defaults: one neutral initial color, circle, medium, centered, `m` gaps, labels on/hex off; nominal sizes 32/48/64 px and uniform emergency shrink.
4. Approve captions below the shape on a fixed contrast-safe neutral surface, one typography role with bounded sizes, and accessible hex descriptions even when visually hidden.
5. Confirm Hero/Blank-only initial insertion. Gallery/RSVP expansion is a separate explicit capability decision; no other Section should gain Swatches implicitly.
6. Confirm owner-local palettes: custom Mobile begins as a copy but does not track subsequent Shared palette edits. Global semantic palette synchronization would be a materially different feature.
7. Choose immediate literal picker edits (simpler) or explicit Apply/Cancel with transient canvas preview. Neither choice should persist colors into the project library.

Opaque-only colors, static guest content, event-neutral vocabulary, and no new Section/template/table follow the approved direction. They do not need an additional architecture approval gate.
