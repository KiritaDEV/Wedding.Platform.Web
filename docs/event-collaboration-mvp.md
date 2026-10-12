# KIRITA — Event Collaboration MVP

Implemented and checked on 2026-10-12. Web and API remain on their existing `develop` branches. No commits, pushes or deployment were performed.

## Architecture and compatibility

The Phase 0 audit was reviewed against the current models, membership migration, Event creation, EventPolicy, routes, resources and workspace code. Its core findings still apply: ownership is an `event_memberships.role=owner` row; memberships have a unique `(event_id, user_id)` constraint; there is no authoritative owner FK or single-owner database constraint. The MVP deliberately follows the approved narrower scope rather than implementing the audit's broader recommendations.

The existing `admin` enum/storage/API value is reused as Manager. New grants always use `EventMembershipRole::Admin`. The Settings member list, Event cards and workspace navigation display **Manager**. Existing role schemas and Event responses remain compatible; no equivalent second role was introduced.

Ordinary EventPolicy `view` and `update` behavior is unchanged. Owner/Admin memberships retain their existing operations, including invitations/private-link management, website drafts, media and publication. There are no new ownership-transfer or Event-delete endpoints.

The new `manageCollaborators` ability requires exactly one Owner membership and requires that Owner's user ID to match the authenticated actor. Zero or multiple Owners fail closed with 403. Platform SuperAdmins receive no bypass for collaborator administration. **The pre-existing SuperAdmin bypass for ordinary Event access remains:** removing a SuperAdmin's membership does not revoke their independent platform privilege. Removal immediately revokes ordinary membership-based access for normal accounts.

## Endpoints and authorization

All three endpoints use existing `auth:sanctum` authentication and the existing credentialed/CSRF frontend client.

| Endpoint | Behavior |
|---|---|
| GET `/api/events/{event}/collaborators` | Owner-only list of this Event's memberships; returns `{data: [{id, name, email, role}]}`. `id` is the membership ID; no User ID, platform role, account search or unrelated account data is returned. |
| POST `/api/events/{event}/collaborators` | Owner-only; accepts exactly `{email}`. Returns the created member resource with 201. |
| DELETE `/api/events/{event}/collaborators/{membership}` | Owner-only; resolves membership through the specific Event, rejects Owner removal, physically deletes a non-Owner membership and returns 204. |

Predictable failures: unauthenticated 401; unauthorized or invalid Owner integrity 403; missing Event or foreign/missing membership 404; invalid email, unknown account, duplicate/self-add, unexpected input fields or Owner removal 422. Unknown email returns the generic field message `This account is unavailable for collaboration.` Authorization occurs before account resolution. Client-supplied User IDs, roles, platform roles, ownership and other fields are rejected rather than mass-assigned.

Email normalization matches registration/login: lowercase and trim only. The server resolves an existing registered account; no invitation, verification, delivery, acceptance or broad user-search system is added. Adding an account grants access immediately. Its next authenticated `/events` fetch includes the Event through the existing membership relation.

Add/remove are deliberate domain actions inside transactions. Both lock the Event row first and reauthorize after obtaining the lock. Concurrent adds through this endpoint therefore serialize on the same Event in a database with row-lock support. The existing unique membership constraint remains the final duplicate guard; deadlock transactions may retry up to three times. These actions neither create nor remove Owner memberships.

## Workspace UI

Event Settings renders one keyed `EventCollaborators` component only for `membershipRole=owner`. Laravel remains authoritative. Managers retain timing/RSVP settings and the existing workspace without making collaborator-administration requests.

The panel shows member names, emails and Owner/Manager labels. Only Managers have Remove buttons. Addition uses a labelled email form; removal uses the existing native Dialog with Cancel and explicit confirmation. Loading, retry, server validation, success and failure states are visible and accessible. Mutations disable controls and use an in-flight guard. Failed initial loading does not enable administration. Authorization failure hides administration controls.

The component resets on Event switching, aborts list requests on cleanup, ignores stale list responses and avoids updating an unmounted component after mutations. Names/emails wrap; the form stacks on mobile. Existing typography, surface, button, input and dialog tokens are reused.

## Files changed for this MVP

Paths below are relative to `C:/Users/User/source/repos/kirita/`.

| Repository | Files | Purpose |
|---|---|---|
| API | `app/Policies/EventPolicy.php` | Separate sole-Owner collaborator ability; ordinary abilities unchanged. |
| API | `routes/api.php` | Three authenticated Event-scoped routes. |
| API | `app/Http/Controllers/EventCollaboratorController.php` | Scoped list/add/remove orchestration. |
| API | `app/Http/Requests/StoreEventCollaboratorRequest.php` | Authorization, normalized email validation, rejection of unexpected fields. |
| API | `app/Http/Resources/EventCollaboratorResource.php` | Minimal membership/name/email/role response. |
| API | `app/Actions/Events/AddEventCollaborator.php`, `RemoveEventCollaborator.php` | Transactional, locked grants and revocation. |
| API | `tests/Feature/EventCollaborationTest.php` | Focused API security, compatibility, revocation and snapshot tests. |
| Web | `src/features/eventCollaborators/api.ts` | Typed response validation and scoped credentialed/CSRF API adapter. |
| Web | `src/features/eventCollaborators/EventCollaborators.tsx` | Owner management panel and removal confirmation. |
| Web | `src/pages/workspace/EventSettingsPage.tsx` | Owner-only, Event-keyed integration. |
| Web | `src/features/events/EventCard.tsx`, `src/features/events/workspace/EventWorkspaceNavigation.tsx` | User-facing Manager labels. |
| Web | `src/features/eventCollaborators/eventCollaborators.test.tsx`, `eventCollaborators.browser.test.ts` | Role visibility, API contract and real Chrome interaction/layout checks. |
| Web | `docs/event-collaboration-mvp.md` | This implementation and verification report. |

Pre-existing footer renderer changes, branding PNG/component/tests/reports and the identity audit were preserved. No `.env`, dependency, migration, Section, draft contract or snapshot implementation was changed.

## Verification results

| Check | Result |
|---|---|
| `php artisan test --filter=EventCollaborationTest` | **9 passed, 95 assertions.** Owner add/list, normalization, Manager listing/ordinary settings/invitation/media access, Owner-only denials including nonmember SuperAdmin, injection/duplicate/self/unknown rejection, Owner protection, invalid Owner integrity, cross-Event isolation, removal/next-request denial, other Event/login preservation, unauthenticated denial, repeat-add and DB uniqueness guard. |
| Existing API regressions: `AccountsAndEventAccessApiTest`, `MediaAssetTest`, `WebsitePublicationTest`, `AtomicWebsitePublicationTest`, `PublicEventSiteTest`, `PrivateInvitationSiteTest`, `PrivateInvitationFoundationTest`, `WebsiteDraftApiTest` | **78 passed, 556 assertions.** Existing Owner/Admin/SuperAdmin behavior, publication/draft contracts, media and public/private guest authorization continue to pass. |
| Explicit collaboration snapshot regression | Add/remove leave website raw attributes, Sections and public guest payload identical, including the existing published snapshot. |
| Web collaborator tests | **6 passed across 2 files**, including real headless Chrome. API adapter normalizes email, sends only email, encodes Event/membership paths, initializes CSRF, rejects malformed roles. Settings role gating preserves ordinary panels. |
| Final Web focused run, including existing footer/preview tests | **31 passed across 4 files.** |
| Chrome runtime checks | Loading; unknown-account field error; add success; duplicate-click guard; Owner protection; Cancel without DELETE; confirmed DELETE; list update; Event switching; late prior-Event response isolation; Manager UI/request exclusion; failed-load retry; no captured browser errors/unhandled rejections. Component geometry checks at 320/768/1280 pixels passed without horizontal overflow. Network calls use a controlled mock, not a live API. |
| `npx tsc -b` | Passed. Also included in production build. |
| `npm run lint` | Passed across the Web repository. |
| `npm run build` | Passed. Vite reports the existing large-bundle warning (>500 kB); no build failure. |
| Laravel Pint on changed PHP application/test files | Passed after formatting the new test's class-property spacing. |
| `php artisan route:list --path=collaborators` | Exactly the three intended routes registered. |
| Diff checks | Passed for both repositories and new MVP files. |

API tests ran using the configured isolated SQLite in-memory test database, not production data. No destructive database reset command was run. Full Web/API suites were not run and are not claimed green.

**Real MySQL concurrent-request verification was not performed.** Sequential SQLite repeat-add tests and direct uniqueness rejection do not prove production race behavior. The implementation's serialization is source-backed; verify two simultaneous POSTs against an isolated MySQL staging Event before rollout. Expect one 201, one duplicate 422 and exactly one Manager membership, with no 500. Also verify simultaneous add/remove behavior and the configured production engine's row-lock semantics. No production database or existing Owner data was inspected.

## Schema and deferred work

No schema changes or migrations. No new role value, owner FK, invitations, status lifecycle, permission tables or organizations. Physical non-Owner deletion follows the existing membership architecture; historical membership auditability is deferred. Also deferred: email verification/delivery/acceptance, recovery changes, authoritative owner FK, ownership transfer, Event deletion, advanced permissions and staff management. Existing out-of-band SQL/domain membership writers and User-deletion cascades can still damage Owner integrity; this MVP detects invalid integrity instead of repairing or guessing ownership.

## Manual verification with two real accounts

1. Use a staging Event owned by Account A and an existing normal registered Account B. Confirm the Event has exactly one Owner. Use separate browser profiles/sessions.
2. A opens Event Settings: confirm Owner in the list, no Owner Remove button, and add B using a mixed-case email. Confirm Manager appears and no invitation/email is sent.
3. B refreshes `/events`, opens the shared Event, and exercises timing/RSVP, invitations/private-link controls, website editing, media upload and publish/unpublish. Confirm Settings has no collaborator administration.
4. As B, directly call all three collaborator endpoints for that Event; expect 403. Attempt role/User ID/Owner injection as A; expect 422. Try unknown email, A's email and B's email again; expect field errors and no extra memberships.
5. A selects Remove then Cancel; B keeps access. A confirms removal; B's next Event reads/writes must return 403 and the next Event list omits this Event. Verify B's login and separate Event remain available. A remains Owner.
6. Switch A between two owned Events while a list request is delayed; confirm the active Event's list and messages stay scoped. Check keyboard access, dialog dismissal, visible focus and mobile/tablet/desktop layouts with realistic long names/emails.
7. Confirm a published public site and authorized private guest link still render their existing snapshot; unauthorized private access remains denied. Grant/remove does not revoke guest links or publish draft changes.

## Deployment considerations and remaining checks

Deploy the API routes/classes and compatible Web build together using the normal deployment process; no migration or production data rewrite is needed. Refresh route caches through that process if enabled. Do not ship Web against an API missing these routes.

Before production rollout, inspect Owner integrity read-only, verify the existing unique membership constraint, complete the MySQL concurrency checks and the two-account staging checks above, and confirm normal Sanctum/CSRF behavior in the deployed environment. Events with invalid Owner data require deliberate administrative repair outside this MVP; no automatic backfill is supplied. No production deployment was performed.

KIRITA EVENT COLLABORATION MVP COMPLETE
