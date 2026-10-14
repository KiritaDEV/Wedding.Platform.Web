# Google Maps maximum-width presets

Implemented 2026-10-14. This extends the existing generic Map leaf block; the provider, embed parser, URL security restrictions, and Group architecture are unchanged.

## Contract and backward compatibility

Optional field: `appearance.width`.

| Value | Maximum width |
| --- | --- |
| small | 320px |
| medium | 480px |
| large | 640px |
| full | 100% of available parent width |

Missing width resolves to full in the renderer and inspector. New Map creation stays sparse, matching the existing Map defaults: no appearance object or explicit width is injected. Validation, draft normalization, duplication, and snapshot decoding preserve missing width rather than rewriting existing records. Explicit full is accepted and retained. No migration or snapshot version change is needed.

The Web Zod schema accepts only the four string presets; MapElement inherits the field through schema inference. PHP independently enforces the same enum and JSON string type, including rejecting null, empty strings, numbers, booleans, objects/lists, arbitrary CSS, and unsupported preset names. Existing API spacing/animation extraction and restoration still apply. Aggregate saves reuse the existing section validator. Existing published snapshots without width decode and render as full.

Width belongs to its Map placement. A custom Desktop/Tablet/Mobile composition owns an independent cloned element tree, including its width; it replaces Shared for that viewport. No nested responsive width field was added. Draft edits remain private until republishing.

## Renderer and wrapper geometry

MapElementRenderer applies width:100% and the selected maximum width to the actual rounded Map container. Its used width is the smaller of the available parent width and the preset cap. Full and omitted width use max-width:100%.

Logical inline margins position that container:

- start: start margin 0, end margin auto;
- center (including omitted alignment): both inline margins auto;
- end: start margin auto, end margin 0.

The existing full-width WebsiteElementFrame, motion, outer-spacing, and Group wrappers provide the available layout region. They do not override the Map's maximum width or margins. No general Group or Section layout changes were necessary. The Map stays in normal document flow with position:relative; it is not absolutely positioned or detached from Hero flow.

The iframe fills its Map container, rather than acting as the aligned sub-element of a full-width visible map. Existing preset heights (240/360/480px), radii (0/8/16/24px), clipping, controlled iframe attributes, and lazy loading remain unchanged. Pointer events and keyboard iframe focus remain disabled in Edit mode and enabled for management preview/public/private rendering.

## Inspector

Maximum Width sits beside the existing appearance fields, immediately before Height. It uses the shared InspectorField and Select components within the existing Map appearance InspectorSection. The existing text-xs labels, section spacing, shared textarea/helper text/Button components, and Horizontal alignment control are retained.

Options are Small - 320px, Medium - 480px, Large - 640px, and Full - Available width. There is no slider, arbitrary pixel field, or percentage input. Changing width preserves the validated embed URL, including while the local HTML input is invalid.

## Files changed for this enhancement

Web:

- src/features/websiteElements/schemas.ts
- src/features/websiteElements/googleMaps.test.ts
- src/features/websiteRenderer/MapElementRenderer.tsx
- src/features/websiteRenderer/googleMaps.browser.test.ts
- src/features/websiteEditor/components/MapElementEditor.tsx
- docs/google-maps-width-presets.md
- docs/google-maps-block-mvp.md (points to the updated width behavior)

API:

- app/Website/Elements/GoogleMaps.php
- app/Website/Elements/WebsiteElementValidator.php
- tests/Unit/GoogleMapsContractTest.php
- tests/Feature/GoogleMapsBlockTest.php

These edits extend the existing uncommitted Map implementation. Unrelated changes, including docs/swatches-block-architecture-audit.md and .env, were preserved. No dependencies, migrations, commits, pushes, or deployment were introduced.

## Verification

- Focused Web: 7 files / 89 tests passed, including contracts, renderer, composition lifecycle/isolation, publishing/snapshot tests, and actual Chrome geometry.
- Chrome: 180 rendered cases cover all four width presets plus omitted width, all three alignments, 320/768/1280px containers, root placement, one Group, nested Groups, and narrow nested grid cells. Both templates, Shared/custom owners, editor, management preview, public-site and private-site audiences are represented. The matrix crosses width/alignment/viewport/placement and rotates template/ownership/audience; it is not the full Cartesian product of every dimension.
- Chrome checks actual getBoundingClientRect values against min(parent width, preset maximum), left/center/right position within the parent frame, iframe fill, parent/Group/Hero containment, heights, radii, overflow, normal-flow positioning, and editor selection/interactivity. Every case JSON-round-trips through the published snapshot decoder first; omitted-width cases therefore exercise legacy snapshot compatibility.
- Browser inspector checks the default Full option and selects Small through the actual shared Select. The persisted width changes while the last valid URL survives invalid local paste text.
- API: 38 tests / 276 assertions passed across GoogleMaps, PublishedWebsiteSnapshotTest, PublishedWebsiteSnapshotPersistenceTest, and SnapshotGuestPresentationTest. New coverage validates presets and strict rejection, preserves legacy records, rejects invalid draft writes without mutation, and saves/publishes each width for both public and private guests.
- Repository ESLint, TypeScript, production build, API Pint, and both Git diff whitespace checks passed. The build retains the existing large-bundle warning.

The first 720-case browser attempt timed out. The final 180-case matrix removes redundant combinations while preserving the width/alignment/viewport/placement checks above. The geometry harness blocks external frames using its existing test-only CSP, so measurements do not depend on Google network responses. Production iframe loading behavior is unchanged. Full repository test suites were not run.

## Remaining manual checks

1. In the live editor compare Map appearance labels/spacing with Divider and Countdown. Set each Maximum Width and confirm Left/Center/Right visibly moves capped maps in a wide parent.
2. Check Desktop/Tablet/Mobile and narrow/nested Groups with actual authored content, spacing, and animations. Confirm no horizontal scrollbar and unchanged heights/corners.
3. Save/reload a width, duplicate the Map, customize a device composition, and verify Shared/custom isolation in the editor.
4. In management preview and published public/private guest pages, pan/zoom the real Google map and test fullscreen. Verify Edit mode still selects the Map instead of interacting with it.
5. Save another width without publishing and confirm guest output is unchanged; publish and confirm the new width appears. Open an older snapshot without width and confirm full-width behavior.
6. Inspect deployment Network/Console for existing host CSP or external Google restrictions. No production deployment, real-device session, or live Google-service interaction was performed by these automated checks.

KIRITA GOOGLE MAPS WIDTH PRESETS COMPLETE
