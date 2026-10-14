# Google Maps Block MVP

Implemented 2026-10-14 in Wedding.Platform.Web and Wedding.Platform.API.

Follow-up: [Maximum-width presets](google-maps-width-presets.md) adds optional appearance.width and makes horizontal alignment visible for capped maps. The original MVP verification receipt below records the pre-enhancement test matrix.

## 1. Integration architecture

Map is the canonical generic leaf type `map`, with the user-facing label Google Maps. It follows Text/Media/Divider/Countdown through the existing element union, capability response, Structure insertion menus, inspector, shared leaf renderer, and Section/Group frames. Root insertion is enabled for Hero and Blank, matching the existing unrestricted generic block family. Gallery and RSVP retain their existing restricted child sets.

Existing root/Group element limits and the two-level Group depth limit remain authoritative. Duplication creates fresh element identities and preserves the URL. Device custom compositions clone complete independent trees; they replace Shared for that viewport. Map content is owned by its placement, with no shared-content definition, specialized Section, template, table, migration, or new dependency.

The existing draft serializer, revision save, publication builder, snapshot reader, and public/private presentation paths carry the element. Published maps are frozen snapshots: saving a draft does not change guest output until publication. Empty maps are valid builder state and show a placeholder only in Edit mode.

## 2. Canonical schema and validation

Example shape (URL abbreviated here only):

```json
{
  "id": "map-identity",
  "type": "map",
  "editorName": "Google Maps 1",
  "embedUrl": "https://www.google.com/maps/embed?pb=...",
  "appearance": {
    "height": "medium",
    "alignment": "center",
    "cornerRadius": "medium"
  }
}
```

`embedUrl` is optional for an unconfigured block; when present it must pass independent TypeScript and PHP validators. No raw HTML or user-supplied iframe attributes are persisted. The exact validated source string is retained, preserving percent encoding and query order without lossy decode/re-encode operations.

Strict appearance fields:

| Field | Values | Default |
| --- | --- | --- |
| height | small / medium / large | medium (360px) |
| alignment | start / center / end | center |
| cornerRadius | none / small / medium / large | medium (16px) |

Heights are 240/360/480px; radii are 0/8/16/24px. Existing outerSpacing, isHidden, editorName, and animation remain supported. Responsive branches accept the existing spacing/animation contract, while device-specific Map appearance/content uses custom composition ownership. Raw JSON shape guards reject arrays in place of appearance objects, including during snapshot decoding. Existing empty-object serialization preserves empty Map appearance objects.

## 3. Security restrictions

- Paste accepts one iframe with quoted attributes and no child content. The supplied venue is a fixture only, never a default.
- An XML DOMParser parses the supported Google Share HTML subset in a separate, non-executing document. Raw ampersands are escaped while existing XML entities are retained. No parsed node is attached to the page. DTDs, processing instructions, comments, scripts, duplicate attributes, malformed markup, additional roots, and unsupported attributes are rejected.
- Allowed paste attributes: src, numeric width/height, border:0 style, allowfullscreen, loading, supported referrerpolicy values, and title. These attributes are validated then discarded; only src reaches the data contract.
- HTTPS, exact authority www.google.com, and exact path /maps/embed are required. Userinfo, explicit ports, alternate hosts, path normalization tricks, fragments, backslashes, malformed percent escapes, invalid UTF-8, and raw non-ASCII URLs are rejected. Non-ASCII location names survive in ordinary percent encoding.
- Query keys are limited to one pb and an optional hl locale, with no duplicates or empty query segments. Unknown redirect/key/url parameters are rejected. pb must have the Share-format !1m positive-count prefix followed by protobuf-style marker tokens; controls and markup are rejected after decoding. This is structural validation of Google's opaque payload, not a claim to verify a venue exists.
- API key Embed API paths (/maps/embed/v1/...) are rejected. No key is required or configured.
- TypeScript checks again at rendering; invalid URLs fail closed even if an untyped caller bypasses schema decoding.

Parser background: [MDN DOMParser.parseFromString](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString). XML mode is intentional: unlike forgiving HTML parsing it reports malformed markup, and the parsed iframe is never instantiated as a live HTML browsing context.

## 4. Editor controls

The inspector exposes Google Maps embed HTML, Height, Horizontal alignment, and Corner radius using existing InspectorSection and InspectorField layouts, Select, Textarea, Text helper copy, and Button controls. Inspector section spacing matches Divider and Countdown (space-y-5 pt-5); field labels use the shared text-xs treatment. The input is local React state. A valid paste updates only embedUrl; an invalid or temporarily incomplete paste displays an actionable error and preserves the last valid element. Appearance edits therefore cannot persist invalid input. Remove location explicitly clears the saved URL.

The existing shared outer spacing and animation editors remain available. Structure supports insertion, duplication, renaming, visibility, and Group placement. Edit-mode iframe pointer events are disabled and its tab index is -1, allowing the existing selection frame to receive canvas gestures. Public/private guests and management preview use the interactive renderer.

## 5. Renderer behavior

A single MapElementRenderer renders through WebsiteLeafElementRenderer. The block stretches to available container width with min-width:0, max-width:100%, fixed preset height, and clipped rounded corners. The iframe has 100% width/height and no border. It uses the controlled title Location on Google Maps, lazy loading, strict-origin-when-cross-origin referrer policy, and allowFullScreen. No raw HTML injection, user-controlled scripts, iframe attribute spreading, or Hero positioning logic is used.

Outer spacing, motion, visibility, normal flow, and Group containment use existing wrappers. Hero can grow vertically when its content needs more than its configured minimum height.

## 6. Files changed

Web:

- src/features/websiteElements/{constants.ts,blockIdentity.ts,types.ts,schemas.ts,googleMaps.ts,googleMaps.test.ts,fixtures/google-maps-contract.json}
- src/features/websiteCapabilities/schemas.ts
- src/features/websiteEditor/sectionChildFlow.ts
- src/features/websiteEditor/components/{rootAddElementItems.ts,sectionChildListHelpers.ts,SectionChildList.tsx,MapElementEditor.tsx}
- src/features/websiteRenderer/{WebsiteLeafElementRenderer.tsx,WebsiteElementFrame.tsx,elementRenderability.ts,MapElementRenderer.tsx,MapElementRenderer.test.tsx,googleMaps.browser.test.ts}
- src/pages/workspace/WebsitePage.tsx
- docs/google-maps-block-mvp.md

API:

- app/Website/Elements/{WebsiteElementType.php,WebsiteElementValidator.php,CompositionGroupValidator.php,GoogleMaps.php,DividerJsonShape.php}
- app/Website/Capabilities/WebsiteCapabilityResolver.php
- app/Website/WebsiteSectionContentValidator.php
- app/Http/Requests/UpdateWebsiteSectionContentRequest.php
- app/Website/Publishing/PublishedWebsiteSnapshotReader.php
- tests/Unit/GoogleMapsContractTest.php
- tests/Feature/GoogleMapsBlockTest.php
- tests/Fixtures/google-maps-contract.json

Pre-existing untracked docs/swatches-block-architecture-audit.md was preserved. .env was not modified. No commit, push, deployment, or migration was performed.

## 7. Test results

- Final combined Web focused regression: 24 files / 482 tests passed (including the Chrome test, element contracts, Text/Divider/Countdown rendering, insertion/duplication, capabilities, composition lifecycle/isolation, and publishing).
- Chrome geometry/interaction: 1 browser test passed with 288 rendered cases across editor/public/private/management-preview, Shared/custom, both templates, three widths, all heights/radii, and narrow nested Groups.
- API focused regression: 173 tests / 1,230 assertions passed, including the new Map contract/persistence tests and existing Divider, Schedule appearance, snapshot persistence, and guest presentation tests.
- Map-only API suite: 5 tests / 60 assertions passed.
- TypeScript and production build passed. Vite reports the existing bundle-size warning (main chunk exceeds 500kB).
- Repository ESLint, API Pint on changed files, and both Git diff whitespace checks passed.

The initial expanded Chrome run exceeded the process timeout while hundreds of real Google frames were eligible to load. The geometry harness now uses a test-only frame-src 'none' policy, keeping measurement independent of external requests; the corrected 288-case run passed. This policy is only in the test server and is not shipped.

Coverage includes mirrored Web/API URL fixtures; the supplied Google Share HTML; encoding and optional locale preservation; spoofed hosts, HTTP, redirects, wrong paths, missing/empty/malformed pb, duplicate query keys and markup, event handlers, srcdoc, scripts, malformed UTF-8, unsupported attributes, and raw HTML rejection. Real Chrome tests exercise non-executing parsing and actual React input events to establish that invalid editor text does not mutate saved element state.

Browser geometry uses actual Chrome getBoundingClientRect and computed styles at 320, 768, and 1280px, both templates, Shared/custom compositions, all heights and radii, nested Groups including narrow grid cells, selection callbacks, Edit-mode pointer suppression, public/private/management preview interactivity, and full-screen Hero containment. Browser fixtures JSON-round-trip and decode through the published snapshot contract before rendering. API feature coverage proves draft persistence, invalid write rejection, publication, both guest audiences, and snapshot isolation after a valid draft edit.

## 8. CSP and external embedding considerations

No Content-Security-Policy header or meta policy was found in the checked Web src/public/index.html or API app/config source. No CSP source change was necessary. A CDN, reverse proxy, or hosting service can still apply a policy independently; those production headers were not inspected.

A deployment with a restrictive CSP must permit https://www.google.com/maps/embed in frame-src (or its existing equivalent narrow frame allowance). Do not weaken script-src or allow arbitrary frame origins. Google's frame manages its own resources and policies. Ad blockers, third-party restrictions, lack of network access, Google service changes, or host CSP can prevent map loading. Browser geometry checks establish the host iframe behavior; they do not certify Google's remote map UI or production headers. Loading a map contacts Google and shares visitor network/browser data under Google's policies.

## 9. Manual smoke tests

These are deployment/operator checks, not claims of completed live production testing:

1. Add Google Maps to Hero/Blank at root, in a Group, and in one nested Group. Confirm the existing element/depth limits still apply.
2. Paste a fresh Google Maps Share > Embed a map iframe. Confirm the actual venue loads, and clicking the map in Edit mode selects it.
3. Temporarily break the input; change Height/radius and save. Confirm the previous valid map remains. Try unsafe HTML and confirm an error.
4. Set every height/radius, inspect Desktop/Tablet/Mobile, test a narrow horizontal Group, and check for horizontal scrolling or corner leakage.
5. Duplicate, hide/unhide, rename, animate, change outer spacing, and configure a custom device composition. Confirm Shared and custom maps remain independent.
6. Open management preview and confirm map panning/zooming/fullscreen. Publish and check public and private invitation guest pages on a real mobile device.
7. Save a different location without publishing; guests must retain the previous published location. Publish and confirm the change.
8. In deployment DevTools inspect Network/Console for Google frame requests, CSP refusals, and browser restrictions. Verify hosting headers before release.

## 10. Known limitations

- The original full-width-only limitation is superseded by [Maximum-width presets](google-maps-width-presets.md). Omitted width remains full for backward compatibility.
- Only Google's quoted Share iframe subset and pb-based endpoint are supported. Other HTML, provider URLs, key-based Embed API URLs, search/autocomplete, and live location lookup are out of scope.
- Google's pb format is undocumented. Structural validity cannot prove the location exists or that Google will continue accepting that payload.
- No live production deployment or real-device external Google interaction was performed. Full repository test suites were not run; the recorded focused regression results are the verified boundary.

KIRITA GOOGLE MAPS BLOCK MVP COMPLETE
