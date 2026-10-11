# Schedule Phase 2 contract

Schedule is still a generic Block in Hero/Blank and nested Groups. A placement has exactly one of local `days` or its Section-owned `contentId`. Shared definitions contain `{ id, type: "schedule", content: { days } }`. Device customization preserves references and keeps appearance independent. Explicit duplication regenerates definition, Day and Activity IDs; moving an Activity keeps its ID.

Every Day has `id`, `date`, `title`, `visible`, `activities`. Every Activity has `id`, `title`, `startTime`, `endTime`, `description`, `location`, `mapUrl`, `imageMediaId`, `visible`. All fields must be present. Text/date/time/image fields are nullable. Empty strings normalize to null; whitespace is retained in storage. Visibility is a required actual boolean. Unknown fields are rejected. Days/Activities must be JSON lists of objects.

Bounds: 20 Days and 100 total Activities per Schedule, including hidden content. IDs: nonempty, no whitespace, at most 255 characters, unique across Days and Activities within the Schedule. Day/Activity titles and location: 255 characters. Description: 5,000 characters; CRLF/CR becomes LF, all other whitespace and multiline content preserved. Map URL: 2,048 characters. Image ID: ULID owned by the Event and supported image type, validated by existing canonical media ownership rules.

Dates are calendar-valid YYYY-MM-DD with years 0001–9999. Times are nullable HH:mm strings. End requires start and must be later the same day; overnight ranges are rejected. No timezone conversion, automatic sorting, or browser-local Date storage occurs.

Map URLs must use explicit HTTPS, no credentials, no whitespace/backslashes, no encoded authority, and no nondefault port (443 is accepted). Exact case-insensitive allowed hosts: `google.com`, `www.google.com`, `maps.google.com`, `maps.app.goo.gl`, `waze.com`, `www.waze.com`, `maps.apple.com`. No suffix matching or regional Google hosts. Links use noopener/noreferrer and unsafe unsaved links are never rendered.

Blank titles and empty Days can be saved. Structurally invalid dates/ranges/URLs cannot be saved, even when hidden. The inspector preserves invalid text locally with an error until corrected. Publication requires a nonblank title on every visible Activity in visible Days of enabled Sections and visible placements/parent Groups. Hidden incomplete display content does not block publication. Diagnostics identify project, Section, Block, Day, Activity, content reference, and field. All captured storage content is validated; no malformed-data or mutable-draft fallback exists.

Snapshots retain hidden/disabled content and its media identities. Public/private presentation removes hidden Days/Activities and untitled Activities before canonical guest media extraction. Existing audience rules, invitation trust, atomic Save Draft/revision/409, publication locking and snapshot isolation remain in use. Inactive snapshots retain media until replaced or their project is deleted. Image display/picking is deferred.

Renderer uses authored order. Empty/hidden Days and untitled/hidden Activities are omitted. Multiple rendered Days show title, otherwise literal date, otherwise Day 1/2 based on rendered order. A single rendered Day has no heading. Times retain existing English 12-hour presentation, with optional end time; description preserves line breaks, followed by location and map link. No layout variants or advanced appearance changes.

The development conversion is explicit, transactional and backed up outside the repository. `ScheduleDaysTransition` is used only by that tool/tests, never by application reads. No migration, schema version, snapshot rewrite or database reset is required.
## Phase 2 file map

API additions:
- `app/Website/ScheduleContent.php`: shared canonical validation/normalization and JSON-shape checks.
- `app/Website/ScheduleMediaReferenceProvider.php`: Activity image references through existing media infrastructure.
- `app/Website/Publishing/SchedulePublicationRule.php`: visible Activity publication diagnostics.
- `app/Website/Transitions/ScheduleDaysTransition.php`: explicit tool-only conversion.
- `tests/Unit/ScheduleContentTest.php`, `tests/Unit/ScheduleDaysTransitionTest.php`: validation and transition coverage.

API integration changes:
- `app/Website/SharedContent.php`, `app/Website/Elements/WebsiteElementValidator.php`, `app/Website/WebsiteSectionContentValidator.php`: days contract and nullable normalization boundary.
- `app/Website/Elements/WebsiteElementIdentityRegenerator.php`: Day/Activity identities on Section duplication.
- `app/Http/Requests/UpdateWebsiteSectionContentRequest.php`: original JSON list/object enforcement, reused by aggregate draft saves.
- `app/Website/Publishing/PublishedWebsiteSnapshotReader.php`, `PublishedWebsitePresentation.php`, `WebsitePublicationMediaRule.php`: strict decoding, guest filtering and snapshot-owned definition resolution before media validation.
- `app/Providers/AppServiceProvider.php`, `app/Website/WebsiteMediaReferenceProvider.php`: provider/readiness registrations and contract comment.
- `tests/Feature/SharedContentTest.php`, `WebsiteDraftApiTest.php`, `tests/Unit/WebsiteElementValidatorTest.php`: canonical fixtures and draft/publication/media regressions.

Web additions and integration changes:
- `src/features/websiteElements/scheduleContent.ts`: canonical schema, safe map validation and visible Day selection.
- `src/features/websiteElements/schemas.ts`: local days/contentId contract.
- `src/features/websiteEditor/sharedContent.ts`, `sectionChildFlow.ts`: shared edits and identity regeneration.
- `src/features/websiteEditor/components/ScheduleElementEditor.tsx`, `src/pages/workspace/WebsitePage.tsx`: Days/Activities inspector and saved content boundary.
- `src/features/websiteRenderer/ScheduleElementRenderer.tsx`, `elementRenderability.ts`: visible Days/Activities, headings, ranges, multiline copy and links.
- `src/features/websitePublishing/snapshot.ts`: Activity image manifest identities.
- `src/features/websiteElements/schedule.test.tsx`, `src/features/websiteEditor/sharedContent.test.tsx`, `src/features/websitePublishing/snapshot.test.ts`, `src/pages/workspace/WebsiteSharedContent.browser.test.ts`: schema, shared content, snapshots and real browser operations.
- Existing Schedule fixture updates: `src/features/websiteAnimation/contract.test.tsx`, `src/features/websiteEditor/blankSectionHydration.test.ts`, `compositionLifecycle.test.ts`, `src/features/websiteElements/genericInnerSpacing.test.ts`.
- `docs/shared-content-foundation.md`, `docs/schedule-phase2.md`: current ownership and contract documentation.

The existing dirty working trees include earlier publishing work. This map lists Phase 2 work, not all Git changes. No branch/commit changes, migrations, database resets, new endpoints, image UI or layout variants were introduced.
