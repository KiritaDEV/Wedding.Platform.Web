# Platform branding footer

## Integration and investigation

`WebsiteRenderer` is the common presentation boundary for Classic Filipiniana and Modern Editorial, `PublicEventSiteContent`, `PrivateEventSiteView`, the builder's full Website preview, and `WebsitePreviewPage` (saved-draft preview). It selects the template renderer and resolves audience/device appearance. Each template renders an article containing its enabled, renderable Sections in their existing order.

One reusable `PlatformBrandingFooter` follows that article as a sibling in `WebsiteRenderer`. It is not inside a Section, Hero foreground, motion wrapper, composition group, or editable selection target. Single-section editor scopes omit the footer; full previews include it. Unsupported-template fallback does not include it.

Both templates already suppress disabled Sections and filter empty optional content in public mode. The footer remains after the resulting article even when all Sections are hidden or empty. No template footer implementations were added.

## Rendering and access

The semantic footer contains `Powered by` followed by the supplied orange PNG logo, with `alt="Kirita"` and an accessible Platform branding label. Branding is non-clickable. There are no URLs, tracking, event details, or marketing additions.

Styling uses a solid black fill, no border, light gray 12px text, and the existing template body font. The centered logo is 108px wide with its original aspect ratio, beside Powered by. Modest vertical padding separates it from authored content. Its own surface has no decorative background image. Normal block flow and full width avoid Hero height/distribution inheritance and work at narrow widths.

Guest page loading, unavailable/error and unpublished states return before WebsiteRenderer and have no branding. Login and registration pages do not invoke the renderer. There is no dedicated guest password-entry page in the inspected paths.

Important existing behavior: `ReadPrivateInvitationSite` resolves a valid invitation token and returns the published presentation even for unclaimed or claimed-elsewhere browsers. Trusted status controls household RSVP data and actions, not all authored site content. Branding accompanies this existing site presentation; it is outside embedded RSVP access prompts. Invalid/unavailable invitation links render the existing unavailable screen without branding. No trust checks, route guards, credentials or access-transfer flows changed.

Public and private API presentation uses `PublishedWebsitePresentation` and the stored published snapshot. Saved preview loads `useWebsiteDraft`; the builder's preview uses its current draft. Footer presentation is applied after either data source reaches the renderer. No draft, snapshot, schema, publishing, persistence, Section registry, Structure panel, inspector, API or template configuration changes were needed.

The supplied PNG is stored unchanged at `public/branding/kirita-orange.png`. This is a static platform asset, separate from event-uploaded media and template assets. The image URL honors Vite BASE_URL.

## Files changed

- `public/branding/kirita-orange.png`: supplied orange platform logo, copied without editing.
- `src/features/websiteRenderer/PlatformBrandingFooter.tsx`: reusable semantic branding component using existing design tokens.
- `src/features/websiteRenderer/WebsiteRenderer.tsx`: one shared integration, omitted for single-section scopes.
- `src/features/websiteRenderer/platformBrandingFooter.test.tsx`: both templates, three devices and audiences; actual guest-page paths; absent branding on unavailable states; empty/hidden optional Sections; ordering, single/full scope and input immutability.
- `src/features/websiteRenderer/platformBrandingFooter.browser.test.ts`: real headless Chrome with application CSS; 36 template/device/visibility/mode combinations; count, placement, height isolation, typography, black fill, absent border, successful PNG loading and overflow checks.
- `src/features/websiteRenderer/platformBrandingPreview.test.tsx`: saved-draft preview page with controlled data hooks and the real renderer.
- `docs/platform-branding-footer.md`: this report.

## Verification results

- Focused guest, branding, Hero geometry, draft-save and publication regressions: 12 files / 62 tests passed. After adding empty optional Section coverage and saved-preview coverage, the final two branding unit files passed 25 tests (two more than the earlier run; 64 distinct focused tests overall).
- Headless Chrome branding test passed; all 36 combinations ran at 320px, 768px and 1280px container widths. Browser draft-save/publication and existing Hero distribution regressions also passed.
- TypeScript: `npx tsc -b` passed.
- Lint: `npm run lint` passed.
- Production build: `npm run build` passed, with Vite's warning for a minified chunk larger than 500 kB.
- `git diff --check` passed.
- Web branch: `develop`. Both working trees were clean before implementation. API working tree remains unchanged. No commits or pushes.

## Branding revision verification (2026-10-12)

After replacing the wordmark with the supplied PNG and changing the surface to borderless solid black, all three branding test files passed: 26 tests, including the 36-case Chrome geometry test. Chrome verified the actual PNG loads, its rendered width is 108px, the fill is black and the border is absent.

## Remaining checks and limits

The automated preview-page test controls the loaded draft/event hooks; it does not log into a deployed account. Browser geometry uses fixtures and explicit preview widths, not physical tablet/mobile devices. A manual visual review on deployed real event sites and Safari/iOS remains useful. The entire test suite and API tests were not run; no API code changed. The official marketing URL remains unconfirmed, so no link was added.


