# KIRITA — Phase 0: Identity, Membership and Authorization Architecture Audit

Audit date: 2026-10-12, Asia/Manila. Read-only application audit; only this report was created.

## 1. Executive verdict and evidence boundaries

**Recommend Option A: extend the existing event membership architecture, establish authoritative single ownership, and enforce explicit Laravel capabilities before delivering collaboration invitations. Defer organizations until an approved team workflow requires them.**

Kirita already has `event_memberships`, many-to-many User/Event relationships, and event-specific `owner` and `admin` roles. This is not a proposal to introduce memberships from scratch. One account can already participate in multiple Events. However, membership existence currently grants the same view/update abilities to every member. Email verification, collaborator invitation/acceptance, membership administration/revocation, and an effective-permissions response are missing.

**There is no existing Event owner foreign key.** Ownership is currently a membership with `role=owner`. Creation makes one owner transactionally, but the database does not enforce one owner per Event. Recommend an additive `events.owner_user_id`, eventually non-null with restricted User deletion, backfilled exclusively from validated existing Owner memberships. Preserve Owner membership rows as compatibility mirrors; the new FK becomes the ownership authority. Section 8 compares membership-only ownership fairly.

Option A fits the actual repository because event-scoped listing, nested resource lookups, publishing snapshots and draft conflict handling already exist. Independent couples need no synthetic business organization. Future staff access must be event-assigned, not inherited unrestrictedly from organization membership. The recommendation is based on these boundaries and unresolved business workflows, not merely fewer tables.

Evidence labels used throughout:

- **S — Source-verified:** established by inspected application code, migrations, route declarations or test assertions; not necessarily executed.
- **R — Recommendation:** proposed behavior, not implemented.
- **V — Verification required:** production data/configuration, runtime rendering or concurrency not exercised.
- **P — Product decision:** requires approval before implementation.

No tests/builds were run. API feature tests generally use `RefreshDatabase`; running them would violate this audit's no-database-writes restriction. No database was queried, no migrations/configuration/dependencies/application/test files were changed, and no branches were switched or commits/pushes made.

| Repository | Absolute root | Branch / HEAD | Starting Git state |
|---|---|---|---|
| Web | `C:/Users/User/source/repos/kirita/Wedding.Platform.Web` | `develop` / `45c4bd5d072cb0299fc59ef38a0d93ae51437243` | Existing renderer modification and untracked footer report, PNG, component and three tests; preserved |
| API | `C:/Users/User/source/repos/kirita/Wedding.Platform.API` | `develop` / `0ae1870cef54fc96e4cd1100c88b3e3824709417` | Clean; preserved |

`API/` and `Web/` paths below resolve under these roots. Line anchors refer to the inspected checkout. Production deployment state was not inspected.

## 2. Current identity and authentication — Audit A

| Area | S: current source behavior | Implication |
|---|---|---|
| User identity | `API/app/Models/User.php` uses ULIDs, HasApiTokens, Notifiable and hashed password cast. Users migration has unique email, nullable email_verified_at and platform_role | Reuse independent accounts; no per-Event accounts needed |
| Registration | `AuthController::register:18` explicitly assigns name/email/password, force-sets normal platform role, authenticates and regenerates session | Client cannot register as superAdmin by supplying platform_role |
| Login | `AuthController::login:35` uses Auth::attempt with validated credentials, generic incorrect-credentials response, session regeneration | Session fixation protection exists; verified email is not required |
| Email normalization | RegisterRequest::prepareForValidation:16 and LoginRequest::prepareForValidation:15 lowercase and trim email | HTTP paths align; model/internal writers do not enforce normalization globally |
| Password strength | RegisterRequest uses confirmed password, minimum eight characters | Review policy and abuse limits before public invite enrollment |
| Session authentication | bootstrap/app.php enables statefulApi; authenticated routes use auth:sanctum; config/auth.php uses web session guard | Laravel is the authority; React reflects authentication state |
| CSRF/cookies | Web apiRequest uses credentials include, unsafe-method X-XSRF-TOKEN and ensureCsrfCookie; Sanctum stateful middleware supplies session/CSRF for configured first-party requests | Verify deployed origin, HTTPS, secure/domain/SameSite configuration; CORS is not authorization |
| Logout | AuthController::logout:48 logs out web guard, invalidates current session and regenerates CSRF token | Does not invalidate every device or existing personal access tokens |
| Identity response | UserResource returns id/name/email/platformRole, excludes password/remember token | Add verified-email state for UX, never make it permission truth |
| Platform role | PlatformRole is user/superAdmin; User::isSuperAdmin:56; EventPolicy permits superAdmin bypass | Platform scope differs from Event Owner/Admin |
| Verification | MustVerifyEmail import is commented out; User does not implement it; no verification routes, registration-event dispatch or verified middleware found | Matching email is not proof of inbox ownership |
| Recovery | password_reset_tokens table and broker configuration exist; no recovery/reset controllers, routes or React pages found | Scaffolding is not a working recovery flow |
| Account lifecycle | No email/password/account settings, deletion or suspension endpoint found | Define owner succession and verification reset before exposing lifecycle changes |
| Delivery/worker | config/mail.php defaults log, config/queue.php defaults database. Local .env also selects log/database. Composer dev script starts a queue listener | Production delivery/provider/supervised worker are unproven; database notifications are not email |

Sanctum bearer authentication is also supported by installed `vendor/laravel/sanctum/src/Guard.php::__invoke`. User has HasApiTokens and the token table; IdentityFoundationTest covers model-issued token compatibility. No application token-issuance endpoint was found. Event controllers do not inspect token abilities. **V:** production token existence is unknown. Do not claim authentication is exclusively cookie based or that logout revokes tokens.

**S:** registration's unique-email 422 response enumerates existing addresses; Web displays validation messages. Login uses a generic credentials failure, but response timing was not measured. No application throttle on login/register or enabled API limiter was found in routes, bootstrap, requests or providers. Installed Laravel's default API group conditionally adds throttle only when apiLimiter is configured (`vendor/laravel/framework/src/Illuminate/Foundation/Configuration/Middleware.php:494–499`); this app does not configure it. Edge/WAF limits are V.

**R prerequisites:** use one canonical email rule across registration, login, invites, acceptance, future changes and internal writers. Do not strip provider-specific dots/plus suffixes. Audit database collation and case/whitespace collisions before canonical uniqueness changes; never silently merge accounts. Enforce the rule for every writer and retain a database uniqueness constraint. Add verification, recovery, account/IP rate limits, resend/invite limits and actual email delivery. Verify the authenticated account's current canonical email before acceptance; reset verification on email change. A user ID or unverified matching address is insufficient.

Do not globally enable verified middleware and lock out existing owners during migration. Preserve their current Event operations while requiring verification for new acceptance and approved sensitive collaboration operations. Laravel verification needs both a model contract and routes: [Laravel 12 email verification](https://laravel.com/framework/docs/12.x/verification).

## 3. Event ownership and current grants — Audit B

**S:** `API/app/Actions/Events/CreateEvent.php::handle:18–36` creates Event and Owner membership in one transaction without platform elevation. Events migration contains no owner/creator FK. User::events and Event::users use belongsToMany through event_memberships with id/role pivot data.

Membership schema (`database/migrations/2026_08_13_000001_create_event_memberships_table.php:11–18`): ULID PK; Event/User FKs with cascade deletion; unconstrained string role; timestamps; unique(event_id,user_id). EventMembership casts role to Owner/Admin enum. There is no membership status, accepted_at, revoked_at, or unique-owner constraint.

`EventPolicy::view:10–14` allows superAdmin or any existing membership. `update:16–18` delegates to view. Neither checks role, verification or revocation. A future pending/viewer membership row would satisfy that existence query; unsupported role strings may separately fail enum hydration elsewhere. Pending invitations must never create these permission-bearing rows.

EventController::index uses the authenticated User's events relation, including Owner and Admin Events; it does not assume owner-only or one Event per User. Detail/timing/RSVP settings use Gate. A superAdmin can access unrelated Events by ID, while their event list still contains only memberships; this is existing behavior.

No ownership-transfer, Event-delete or collaborator-management HTTP action exists. Domain/model/SQL writers can nevertheless change/delete membership rows. Zero/multiple Owners are structurally possible. Deleting a User cascades its memberships but leaves Events alive. No owner-preserving account deletion hook was found.

Event::booted deletes RSVP submissions before Eloquent Event deletion; direct SQL deletion bypasses the hook. RSVP restrict/cascade dependencies require database integration checks before a delete endpoint ships. Media created_by_user_id and RSVP/access-audit actor_user_id FKs use set-null; attribution does not grant access.

**R:** preflight exactly one Owner per existing Event. Do not infer owner from oldest member, media creator or event timestamp. Quarantine ambiguity for approved remediation. Preserve existing ownership identities and snapshots during the additive rollout.

## 4. Complete authenticated Event endpoint inventory — Audit C

**S:** `API/routes/api.php:43–104` declares **56 Event-related authenticated routes**. Every row uses **auth:sanctum**. Every current row lacks a distinct Owner-only check. Listing/creation use authenticated identity; other rows use the policy mechanisms below. FormRequest authorize=true is not itself an authorization gap where controller/middleware checks exist.

Literal route abbreviations, all with `/api` prefix:

- `E = /api/events/{event}`; `L = E/website`; `P = E/websites/{website}`; `I = E/invitations/{invitation}`.
- `V` = EventPolicy view: member or superAdmin. `U` = update, currently identical to V.
- `B-V/B-U` = WebsiteDraftBoundary view/update plus controller V. B-U also requires current X-Website-Draft-Revision and coordinates transaction/rollback.
- Coverage refers to inspected test source, **not passing outcomes**. Behavior tests do not prove every permission combination.

### Events and guests

| # / route line | Method / route | Controller method → action/resource | Authorization and resource scope | Existing coverage | R capability |
|---|---|---|---|---|---|
| 1 / 43 | GET /api/events | EventController::index → User::events / EventResource | User membership relation | T1 listing; T2 many memberships | event.view filtered list |
| 2 / 44 | POST /api/events | EventController::store → CreateEvent | Auth User; safe input; creates Owner | T1/T2 creation | authenticated event.create |
| 3 / 45 | GET E | EventController::show → EventResource | V on Event | T1 owner/admin/outsider/superAdmin | event.view |
| 4 / 46 | PUT E/timing | EventController::updateTiming → UpdateEventTiming | U on Event | T3 authorization | event.edit |
| 5 / 47 | PUT E/rsvp-settings | EventController::updateRsvpSettings → UpdateEventRsvpSettings | U on Event | T4 owner/admin/outsider | guests.manage |
| 6 / 50 | GET E/invitations | InvitationController::index → ListInvitations | V; Event invitations | T5 isolation | guests.view |
| 7 / 51 | GET E/invitation-options | InvitationController::options → InvitationOptionResource | V; Event invitations | T6 authorization | guests.view |
| 8 / 52 | GET E/wedding-roles | WeddingRoleController::index → WeddingRoleResource | V; built-ins + Event custom roles | T7 catalog scope | guests.view |
| 9 / 53 | POST E/invitations | InvitationController::store → CreateInvitation | U; Event guests/custom roles | T8 foreign roles/atomicity | guests.manage |
| 10 / 54 | GET I | InvitationController::show → InvitationResource | V; Event invitation | T8 foreign invitation | guests.view; guest_access.manage for private path |
| 11 / 55 | GET I/access-audit | InvitationController::accessAudit → InvitationAccessAuditResource | V; invitation audit relation | T9 authorized read | guest_access.manage |
| 12 / 56 | PUT I | InvitationController::update → UpdateInvitation | U; Event invitation; its Guests | T8 foreign Guest/rollback | guests.manage; guests.delete for permanent removals |
| 13 / 57 | PUT I/rsvp | InvitationController::updateRsvp → UpdateInvitationRsvp | U; invitation Guests; request User actor | T10 RSVP auth/scope | guests.manage |
| 14 / 58 | GET I/rsvp-history | InvitationController::rsvpHistory → RsvpSubmissionResource | V; invitation submissions | T10 history behavior | guests.view |
| 15 / 59 | POST I/activate | InvitationController::activate → SetInvitationStatus | U; Event invitation | T8 Admin lifecycle | guests.manage |
| 16 / 60 | POST I/deactivate | InvitationController::deactivate → SetInvitationStatus | U; Event invitation | T8/T10 retention | guests.manage |
| 17 / 61 | POST E/invitations/{sourceInvitation}/guests/{guest}/move | InvitationController::move → MoveGuest | U; source/destination in Event; Guest in source | T8/T11 move | guests.manage |
| 18 / 62 | DELETE I | InvitationController::destroy → DeleteInvitation | U; Event invitation; domain restrictions | T8 deletion/scope | guests.delete |
| 19 / 63 | DELETE I/trusted-access | InvitationController::resetTrustedAccess → ResetInvitationTrustedAccess | U; Event invitation re-scoped under locks | T12 Owner/Admin reset | guest_access.manage |
| 20 / 64 | POST I/private-link/rotate | InvitationController::rotatePrivateLink → RotatePrivateInvitationLink | U; Event invitation re-scoped under locks | T13 Owner/Admin rotation | guest_access.manage |

Wedding Roles are guest taxonomy, not authorization roles. canPermanentlyDelete is domain eligibility, not User permission; future permissions must intersect existing participation/retention restrictions.

### Media

| # / route line | Method / route | MediaAssetController method → action/resource | Authorization and resource scope | Existing coverage | R capability |
|---|---|---|---|---|---|
| 21 / 66 | GET E/media | index → ListEventMediaAssets | V; Event media | T14 listing/isolation | media.view |
| 22 / 67 | POST E/media | store → UploadMediaAsset | U; server-derived Event/uploader | T14 role/auth upload matrix | media.manage |
| 23 / 68 | GET E/media/{asset} | show → MediaAssetResource | V; Event asset | T14 behavior; separate complete role matrix not found | media.view |
| 24 / 69 | DELETE E/media/{asset} | destroy → DeleteMediaAsset | U; Event asset; draft/snapshot usage protected | T14/T15 deletion/commit | media.manage if unused |
| 25 / 70 | GET E/media/{asset}/variants/{variant} | variant → DeliverMediaVariant | V; Event asset then its variant_key | T14 foreign Event/asset/variant | media.view |

### Legacy singular website

| # / route line | Method / route | WebsiteDraftController method → action/resource | Authorization and resource scope | Existing coverage | R capability |
|---|---|---|---|---|---|
| 26 / 73 | GET L | show → WebsiteDraftResource | B-V; sole Event project, 409 for multiple | T16 role matrix; T17 legacy | website.view |
| 27 / 74 | POST L | store → InitializeEventWebsite | V only; Event initialization | T18 member/auth initialization | website.manage |
| 28 / 75 | GET E/website-templates | creationTemplates → WebsiteCreationTemplateCatalog | V on Event | T18 catalog behavior | website.view |
| 29 / 76 | PUT L/design | updateDesign → UpdateWebsiteDesignSettings | B-U; sole project | T19 design auth; T20 revisions | website.manage |
| 30 / 77 | PUT L/sections/order | reorder → ReorderWebsiteSections | B-U; exact project's Section set | T16 foreign/order validation | website.manage |
| 31 / 78 | POST L/sections | createSection → CreateWebsiteSection | B-U; sole project | T21 lifecycle; complete legacy matrix not found | website.manage |
| 32 / 79 | DELETE L/sections/{section} | deleteSection → DeleteWebsiteSection | B-U; Section in sole project | T21 lifecycle; complete legacy matrix not found | website.manage |
| 33 / 80 | POST L/sections/{section}/duplicate | duplicateSection → DuplicateWebsiteSection | B-U; Section in sole project | T21 lifecycle; complete legacy matrix not found | website.manage |
| 34 / 81 | PUT L/sections/{section}/editor-name | renameSection → RenameWebsiteSection | B-U; Section in sole project | T21 lifecycle; complete legacy matrix not found | website.manage |
| 35 / 82 | PUT L/sections/{section}/enabled | updateSectionEnabled → SetWebsiteSectionEnabled | B-U; Section in sole project | T16/T17 behavior; T20 revision | website.manage |
| 36 / 83 | PUT L/sections/{section}/appearance | updateSectionAppearance → UpdateWebsiteSectionAppearance | B-U; Section in sole project | T22 auth/foreign Section | website.manage |
| 37 / 84 | PUT L/sections/{section}/design-defaults | updateSectionDesignDefaults → UpdateWebsiteSectionDesignDefaults | B-U; Section in sole project | T23 validation; complete role matrix not found | website.manage |
| 38 / 85 | PUT L/sections/{section} | updateSection → UpdateWebsiteSectionContent | B-U; Section in project; Event media validation | T16 outsider/foreign IDs | website.manage |

### Project websites

| # / route line | Method / route | WebsiteDraftController method → action/resource | Authorization and resource scope | Existing coverage | R capability |
|---|---|---|---|---|---|
| 39 / 87 | PATCH P/draft | saveProjectDraft → SaveWebsiteDraft | B-U; project in Event; body Section IDs checked | T20 atomic/revision/isolation | website.manage |
| 40 / 88 | GET E/websites | projects → WebsiteProjectResource | V; Event projects | T17 list/auth/scope | website.view |
| 41 / 89 | POST E/websites | storeProject → CreateWebsiteProject | V only; Event creation | T24 auth/template behavior | website.manage |
| 42 / 90 | POST P/publish | publish → PublishWebsite | **V only**; project in Event; action checks match | T25 roles/scope; T26 atomic | website.publish |
| 43 / 91 | DELETE E/published-website | unpublish → UnpublishWebsite | **V only**; Event pointer | T25 behavior; distinct full deny matrix incomplete | website.publish |
| 44 / 92 | GET P | showProject → WebsiteDraftResource | B-V; project in Event | T17 detail/foreign project | website.view |
| 45 / 93 | POST P/colors | addProjectColor → AddWebsiteProjectColor | B-U; project in Event | T27 validation; T20 revisions | website.manage |
| 46 / 94 | PUT P/design | updateProjectDesign → UpdateWebsiteDesignSettings | B-U; project in Event | T17 mutations; T20 revisions | website.manage |
| 47 / 95 | PUT P/sections/order | reorderProjectSections → ReorderWebsiteSections | B-U; exact project Section IDs | T17 isolation; T20 revisions | website.manage |
| 48 / 96 | POST P/sections | createProjectSection → CreateWebsiteSection | B-U; project in Event | T21 auth/lifecycle; T20 | website.manage |
| 49 / 97 | DELETE P/sections/{section} | deleteProjectSection → DeleteWebsiteSection | B-U; Section in project | T21 lifecycle; T20 | website.manage |
| 50 / 98 | POST P/sections/{section}/duplicate | duplicateProjectSection → DuplicateWebsiteSection | B-U; Section in project | T21 deep IDs; T20 | website.manage |
| 51 / 99 | PUT P/sections/{section}/editor-name | renameProjectSection → RenameWebsiteSection | B-U; Section in project | T21 lifecycle; T20 | website.manage |
| 52 / 100 | PUT P/sections/{section}/enabled | updateProjectSectionEnabled → SetWebsiteSectionEnabled | B-U; Section in project | T17 scope; T20 | website.manage |
| 53 / 101 | PUT P/sections/{section}/appearance | updateProjectSectionAppearance → UpdateWebsiteSectionAppearance | B-U; Section in project | T17/T22/T20 | website.manage |
| 54 / 102 | PUT P/sections/{section}/presentation | updateProjectSectionPresentation → coordinated content/appearance | B-U; Section in project | T28 paired atomicity; T20 | website.manage |
| 55 / 103 | PUT P/sections/{section}/design-defaults | updateProjectSectionDesignDefaults → UpdateWebsiteSectionDesignDefaults | B-U; Section in project | T23/T20 | website.manage |
| 56 / 104 | PUT P/sections/{section} | updateProjectSection → UpdateWebsiteSectionContent | B-U; Section in project | T17 isolation; T20 | website.manage |

**S defect:** publish/unpublish pass an `'update'` argument to authorizedEvent, but that helper accepts only event and always calls Gate::authorize('view') (`WebsiteDraftController.php:455–459`). These routes have no WebsiteDraftBoundary. Do not count them as update checks. Current view/update equality masks it; future view-only members could publish/unpublish/create/initialize through these V-only routes unless every mutation gets the correct capability.

### Ancillary authenticated surfaces

| Method / route | Controller | Current auth/scope | Inspected coverage | R treatment |
|---|---|---|---|---|
| GET /api/time-zones | TimeZoneController::index | auth:sanctum; global IANA catalog | EventTimingTest | Authenticated catalog, not Event grant |
| GET /api/notifications/summary | NotificationController::summary | auth:sanctum; recipient only | UserNotificationTest | Filter by current Event/guest capability |
| GET /api/notifications | NotificationController::index | auth:sanctum; recipient only | UserNotificationTest | Redact revoked Event snapshots |
| PATCH /api/notifications/{notification}/read | NotificationController::read | auth:sanctum; recipient lookup | UserNotificationTest other-recipient 404 | Recipient + current eligibility |
| POST /api/notifications/read-all | NotificationController::readAll | auth:sanctum; recipient update | UserNotificationTest | Consistent eligible scope |
| POST /api/auth/logout | AuthController::logout | auth:sanctum; web session | AccountsAndEventAccessApiTest | Preserve; decide PAT semantics separately |
| GET /api/auth/me | AuthController::me | auth:sanctum; current User | AccountsAndEventAccessApiTest | Add verified status, not global Event rights |

No generic Event PUT/PATCH, Event DELETE, transfer, collaborator/team/organization settings, standalone seating/table, attendance/check-in, event export or standalone Schedule CRUD endpoint was found. Schedule currently persists through website composition/shared content and uses website.manage. Media variants are the present event download surface. Guest CRUD is nested in invitation operations. Absent modules must not be described as already protected by nonexistent policies.

### Inspected coverage dictionary

All paths: `API/tests/Feature/`. Classes match filenames; none were executed.

| Code | Test file | Source evidence emphasis |
|---|---|---|
| T1 | AccountsAndEventAccessApiTest.php | Safe registration, duplicate-email normalization, session/login/logout, Event listing/read role matrix |
| T2 | EventFoundationTest.php | Many memberships, Owner creation, duplicate event/user uniqueness; not single Owner |
| T3 | EventTimingTest.php | test_timing_authorization_matches_event_membership_policy |
| T4 | EventRsvpSettingsTest.php | test_owner_and_admin_can_set_change_and_clear_rsvp_settings |
| T5 | InvitationCoordinatorListApiTest.php | test_authorization_and_event_isolation |
| T6 | InvitationOptionsApiTest.php | test_options_use_event_authorization |
| T7 | WeddingRoleCatalogApiTest.php | Catalog Event scope |
| T8 | InvitationMutationApiTest.php | Foreign roles/Guests/invitations, lifecycle; all-routes-named test samples endpoints |
| T9 | InvitationAccessAuditTest.php | Authorized audit cursor read |
| T10 | OperationalRsvpTest.php | RSVP auth/history/foreign IDs, Admin/superAdmin behavior |
| T11 | GuestLifecycleTest.php | Participation/lifecycle retention |
| T12 | InvitationTrustedAccessResetTest.php | Owner/Admin reset; guest proof is not management login |
| T13 | PrivateInvitationLinkRotationTest.php | Owner/Admin rotation; historical-link trust |
| T14 | MediaAssetTest.php | Upload auth, Event scope, variants, DB content-hash uniqueness |
| T15 | MediaLifecycleUsageTest.php; MediaDeletionCommitTest.php | Used-asset protection and after-commit file deletion |
| T16 | WebsiteDraftApiTest.php | Read roles, order/content/media and Section isolation |
| T17 | WebsiteProjectApiTest.php | Event/project/Section isolation, legacy compatibility |
| T18 | WebsiteInitializationTest.php | Initialization member/auth and template behavior |
| T19 | WebsiteDesignSettingsTest.php | test_design_endpoint_requires_event_access |
| T20 | AtomicWebsiteDraftSaveTest.php | 428/409 revisions, rollback, foreign IDs, existing mutations |
| T21 | WebsiteSectionLifecycleTest.php | Repeatable lifecycle, outsider denial, singleton restrictions |
| T22 | WebsiteSectionAppearanceTest.php | test_endpoint_requires_event_access_and_scopes_section_to_event |
| T23 | WebsiteSectionDesignDefaultsTest.php | Contract validation, not new permission-role matrix |
| T24 | WebsiteProjectCreationTest.php | Creation auth/template/media copying |
| T25 | WebsitePublicationTest.php | test_publication_is_event_scoped_authorized_and_supports_current_policy_roles |
| T26 | AtomicWebsitePublicationTest.php | Snapshot/pointer transactional rollback |
| T27 | WebsiteProjectColorTest.php | Server IDs and library bounds; full role matrix incomplete |
| T28 | WebsiteSectionPresentationTest.php | Paired composition/appearance branches and atomicity |

## 5. Security gaps, severity and verification limits — Audits C/J

Severity is collaboration readiness/impact, not proof of an exploited production vulnerability.

| Finding | Classification / severity | Exact implication | R response |
|---|---|---|---|
| Unverified email identity | S gap; High invitation blocker | Matching an account email cannot prove intended recipient | Verification before acceptance; preserve legacy access |
| No application login/register throttle | S; High abuse risk; edge limits V | Repeated auth/registration attempts unrestricted at app layer | Account/IP/resend/reset/invite limits |
| Membership existence grants all current abilities | S; High before limited roles | No role/status distinction in policy | Explicit capabilities; active-only; deny unknown roles |
| No single-owner invariant | S schema gap; High integrity risk | Multiple/zero Owners allowed; owner account deletion can orphan Events | Validated owner FK/backfill and protected lifecycle |
| V-only website mutations | S; High latent escalation | Read-only memberships would create/publish without proper change ability | Correct route capabilities before adding limited grants |
| Members control guest trust and retrieve paths | S existing broad access; High for restricted staff | Invitation detail exposes path; reset/rotate allow current Admin | guest_access.manage, Owner-only initially, server-side response redaction |
| Notification reads ignore current membership | S predicate omission; Medium latent revocation leak | Stored Event/invitation names/browser metadata survive membership removal | Filter fanout/reads/counts with current permission |
| Registration enumeration | S; Medium privacy/abuse risk | Duplicate-email 422 reveals registered address | Deliberate UX/generic responses where practical + limits |
| Global superAdmin bypass | S intentional existing power; High blast radius | Access to unrelated Events; no scoped support workflow | Explicit support rules/audit; future delete/transfer Owner-only |
| Logout only current web session | S limitation; Medium if PATs exist, V prevalence | Issued tokens/other sessions not revoked | Decide SPA/PAT scope and token lifecycle |
| Event-switch stale context | S state weakness; Medium UX/wrong-target risk, reproduction V | useEventDetail retains previous event/loading state on changed eventId | Key results/permissions to Event; test rapid switching |

**No confirmed outsider cross-event IDOR was found.** Projects are scoped to Event, Sections to project, invitations to Event, move destinations to Event, Guests to source invitation, variants to asset. Tests assert several negative cases. This is not a claim that every payload/runtime/future route is secure.

Mass assignment: AuthController explicitly writes safe fields and normal role. StoreEventRequest::eventAttributes excludes owner/memberships/platform/published pointer. SaveWebsiteDraft rejects unknown top-level fields and checks body Section IDs against the locked project. InvitationStateRequest allowlists nested keys; UpdateInvitation checks current/deleted Guest IDs; ResolveWeddingRoles permits global/current Event roles only. MediaAsset has guarded=[] but UploadMediaAsset constructs server-derived fields rather than accepting request JSON wholesale. No direct HTTP mass-assignment escalation was found. Preserve allowlists when adding owner, role/status and organization data.

**V:** actual owner counts, invalid roles, email collisions, deployed CORS/HTTPS/cookies/PATs, original-file/CDN exposure, mail and worker operation, and production transaction behavior. Local `.env` is development evidence only: MySQL/database sessions, secure cookie false, local media, log mail and database queue. Do not extrapolate production insecurity from local HTTP settings. Tests configure in-memory SQLite/array sessions/synchronous queues and often fake storage; inspected assertions cannot prove production behavior.

## 6. Web route and workspace assumptions — Audit D

**S:** Web src/app/router.tsx exposes `/e/:slug` and `/i/:token` outside ProtectedRoute. Login/register use GuestRoute. ProtectedRoute checks session authentication only; EventWorkspaceLayout then fetches useEventDetail(eventId) and shows API 403/404/loading states. No independent React Event role policy exists.

useMyEvents fetches `/api/events`; schema accepts owner/admin and detail allows null for superAdmin. EventCard/navigation display role labels. Workspace navigation exposes Overview/Websites/Media/Invitations/Settings to all accessible members. Multiple Event IDs are supported; no one-account/one-event assumption was found.

| UI | Existing assumption | R change |
|---|---|---|
| WebsiteProjectsPage | Create/Publish/Publish Changes/Unpublish without User permission checks; busy/validation disabling | website.manage versus website.publish |
| WebsitePage | Inspector/Section editing/save depend on editor/template state | website.view versus website.manage; template capabilities are content support, not User grants |
| EventSettingsPage | Timing and RSVP controls gated by dirty/saving | event.edit versus guests.manage |
| MediaLibraryPage | Upload/delete available; usage eligibility controls deletion | media.view/manage plus existing retention rules |
| InvitationsPage/InvitationsResults | Edit/RSVP/move/rotate/reset/copy available; domain flags/lifecycle affect availability | guests.view/manage/delete and guest_access.manage |
| Notifications | Personal history independent of current Event access | API redaction and cache invalidation after revoke |
| WebsitePreviewPage | Protected route + Event/draft fetch | website.view on both reads; no publish/guest-token rights |

useEventDetail treats 401 by auth refresh, 403 forbidden, 404 notFound. Mutation pages mostly show Error.message; no centralized revoked-access transition was found. apiRequest classifies 401/403 but does not automatically refresh Event grants or evict workspace content. 419 recovery UX remains a future check.

useEventDetail:9–47 retains old event and loading=false during eventId changes; unlike useWebsiteDraft, it lacks a keyed current-result guard. Abort helps requests but does not hide already stored context. This needs browser reproduction/negative switching tests, not a claim of a server bypass.

**R:** Laravel returns effective access with management Event detail/list summary, e.g. `access: {role:'manager', capabilities:['event.view',...], revision:'opaque'}` from the same resolver that policies use. React has one permission helper/context, denies missing/unknown capability and does not maintain another role map. This is a management response change, not a published snapshot contract change. Every API operation still authorizes independently.

Key caches by Event and principal; clear old Event/permissions/guest/media data on switch/logout/forbidden. Preserve unsaved edits on rejected save without continuing unauthorized mutations. Refresh permissions on entry and relevant failures; push updates are optional. Revocation must work server-side without waiting for React refresh.

LoginPage::intendedPath preserves a safe local pathname/search; RegisterPage always redirects `/events`, and GuestRoute redirects signed-in users away from login/register. Acceptance needs an explicit safe return journey through login, new registration and verification. Invitation links are not access grants and must not leak to analytics/referrers.

## 7. Architecture options — Audit E

| Criterion | A: Event membership first | B: Event + organization now | C: Organization-centric ownership/control |
|---|---|---|---|
| Security | Reuse direct Event boundary; fix existing capability gaps | Two scopes can be secure; inheritance/precedence immediately need rules | Org-wide grants violate requirements; per-Event assignment still required |
| Simplicity | Extend existing models/policies; ownership work remains real | Additional policies/routes/lifecycles before team workflow exists | Personal org scaffolding and business ownership rules |
| Coordinator future | Restricted direct membership now, teams later | Staff allocation available immediately if specified | Convenient business-owned Events, harder client-owned weddings |
| Independent couples | Natural User owner | Natural if Event ownership remains separate | Requires personal orgs or split control/ownership |
| Multi-org participation | Deferred; global User reusable | Explicit organization memberships | Supported, but must not union all org Event access |
| Permission isolation | Direct Event-specific preset | Org role must not imply Event grant | Assignment layer necessary despite ownership container |
| Team replacement | Change delegates; personal owner remains | Remove old assignment/grants, add new under Owner consent | Ownership/vendor control can become entangled |
| Migration | Existing membership extension + Owner FK backfill | A plus unresolved org/assignment backfill | Highest: all Events require ownership containers/conversion |
| Query/index work | Membership active list indexes; batch permissions | Org/member/assignment joins and grant origin | All Event access queries need tenancy/assignment logic |
| Maintenance | One collaboration lifecycle | Two invite domains + team removal effects | Complex org deletion/succession/transfers |
| Unnecessary abstractions | Low with Owner/Manager only | High without immediate staff use case | Highest for current couple event creation |
| Source fit | User::events/EventPolicy already scoped | No org models/routes found to extend | No current organization ownership domain |

**R:** A is best for the approved first use case because personally owned Event is already the resource boundary. Choose B if staff allocation/org administration is actually required in the first release; define consent/assignment/revocation first. C should not replace couple ownership under current requirements. A later business-owned Event product may justify explicit separate ownership semantics after approval.

## 8. Recommended data architecture — Audits B/H

### Ownership choice

Membership-only ownership avoids duplicating identity but needs at-most-one Owner uniqueness (partial/generated owner-slot index, engine dependent), last-owner protections and restricted owner-user deletion. A unique index cannot enforce at least one row. It is viable with deliberate transactional lifecycle, but current cascades and broad policy leave that invariant absent.

**Recommend dedicated owner_user_id:** non-null FK represents exactly one authoritative User, supports inexpensive Owner checks, and restricts Owner account deletion independently of delegation. This is a new additive field, not a rename/preservation of an existing one. Retain Owner membership for compatibility/listing/fanout, but every ownership/membership action must maintain it under Event lock. A stray role=owner row must never grant Owner-only abilities; mismatches fail closed and are flagged for repair.

Owner-inclusive event listing uses authoritative owner OR active membership, deduplicated, so missing mirror cannot hide legitimate ownership. Only a dedicated ownership action changes the FK; no ordinary membership or mass-assignment endpoint can do so. Owner cannot leave/revoke/demote themselves. Future transfer updates FK and mirror atomically; no transfer API is required in the first collaboration release.

### Phase 1/2 schema proposals (not implemented)

| Table | Responsibilities/core columns | Keys/constraints/indexes | Deletion/lifecycle |
|---|---|---|---|
| users, existing | Global identity; existing email_verified_at; canonical email enforcement | Existing ULID PK/email unique. Audit collisions/collation before optional normalized_email unique representation | No silent merge; email change resets verification; owner FK restricts owner deletion |
| events, extend | owner_user_id; optional authorization_revision | ULID PK/slug unique retained; User FK/index; nullable expansion, non-null after backfill | Owner User deletion RESTRICT; ownership remains independent of org assignment |
| event_memberships, extend | event_id/user_id/role; status active/revoked/left; activated_at/revoked_at/left_at; optional revoked_by_user_id; timestamps | Existing PK and unique(event,user); explicit enum/check validation; indexes(user,status,event), (event,status,role) | Event CASCADE. Existing User CASCADE acceptable for nonowners because owner FK restricts Owner deletion. Revoker nullable SET NULL; audit snapshot preserved |
| event_collaboration_invitations, new | Separate from guest invitations: id,event_id,email_normalized,role,token_hash,expires_at,status,invited_by_user_id,accepted_by_user_id,accepted_at,revoked_at,pending_slot,timestamps | ULID PK; Event FK; unique SHA-256 token_hash; unique(event,email_normalized,pending_slot), pending slot fixed 'pending' or NULL; indexes(event,status,expires_at), (email_normalized,status) | Event CASCADE; actor User FKs SET NULL plus audit snapshots; expired pending rows retired transactionally before reissue; only non-owner roles |
| event_access_audits, new | Event/actor/target/invitation/action, old/new role/status, occurred_at, correlation, bounded metadata | ULID PK; Event FK; nullable actor/target/invite FKs; index(event,occurred_at,id) | Proposed Event CASCADE, actor/invite SET NULL with snapshots; retention requires approval; append-only application writes; no tokens/passwords |

Roles are explicit code presets/Laravel enums over strings, not new configurable role tables. Ship Owner/Manager only. Preserve legacy admin support during compatibility; map it deliberately to approved Manager capabilities, never Owner. Reviewer/Editor/coordinator roles require later coverage. Existing Owner membership is a compatibility mirror.

Backfill current memberships active; retain one unique Event/User row through revoked/left/reactivated lifecycle. Policy/list/fanout require active. Pending invites create no membership. Old accepted invitations cannot reactivate revoked access; fresh Owner approval required. Add minimal security audit when access administration first ships, not in Phase 5. Existing guest audit/RSVP history cannot substitute for collaborator-access audit.

### Future organization schema direction (deferred)

| Table | Core meaning/columns | Keys/indexes | Deletion/invariant |
|---|---|---|---|
| organizations | id,name,owner_user_id,status,timestamps | ULID PK; owner FK/index; optional unique slug | Owner User RESTRICT; org deletion never transfers personal Event ownership |
| organization_memberships | org_id,user_id,role owner/admin/member,status,join/revoke timestamps | ULID PK; unique(org,user); indexes(user,status,org), (org,status,role) | Org CASCADE; protected org-owner lifecycle; no implicit Event grant |
| organization_collaboration_invitations | Verified-email org acceptance, separate domain | ULID PK; org FK; token hash unique; pending org/email uniqueness; expiry/lookup indexes | Same single-use lifecycle; no Event assignment |
| event_organization_assignments | Owner-approved team relationship: id,event_id,org_id,status,approved_by_user_id,timestamps | ULID PK; unique(event,org); Event/org status indexes | Remove derived grants on detach; retain personal Event owner/direct grants |
| event_organization_user_assignments | Explicit staff-to-Event grant through parent team assignment; user_id,role/status | ULID PK; unique(parent,user); index(user,status,parent); FKs | Requires active parent + org membership + staff assignment; org removal cannot leave derived grant alive |

These tables are recommendations, not approved Phase 1 schema. Multiple concurrent teams and direct/derived grant precedence are P. Distinguish grant origins so org revocation does not erase independently approved direct access. Do not add org_id to all existing content tables; Event remains the resource scope.

## 9. Roles/capabilities/scopes — Audit F

**R:** role = named preset; capability = operation; scope = specific Event/Organization/platform. Use a minimal explicit Laravel resolver/policies. event.view does not grant all sensitive nested data. Y allowed; N denied; D deferred module/role, not shipped now. Future columns evaluate safe presets, not launch approval.

| Capability | Owner | Manager initially | Editor future | Viewer future |
|---|---|---|---|---|
| event.view | Y | Y | Y | Y |
| event.edit, normal timing/details | Y | Y | N | N |
| website.view / saved preview | Y | Y | Y | Y |
| website.manage, composition/appearance/Schedule/draft | Y | Y | Y | N |
| website.publish, publish/unpublish | Y | Y* | N | N |
| media.view | Y | Y | Y | N default |
| media.manage, upload/delete unused | Y | Y | Y | N |
| guests.view, roster/history | Y | Y | N | N default |
| guests.manage, RSVP/settings/move/deactivate | Y | Y | N | N |
| guests.delete, permanent deletion | Y | N* | N | N |
| seating.manage | Y/D | Y/D | N | N |
| attendance.manage | Y/D | Y/D | N | N |
| collaborators.manage, invite/revoke/role change | Y | N | N | N |
| event.sensitive_settings | Y | N | N | N |
| guest_access.manage, private paths/reset/rotate/audit | Y | N* | N | N |
| event.delete | Y/D | N | N | N |
| event.transfer_ownership | Y/D | N | N | N |

*Recommend publication for initial trusted spouse/Manager as normal operations, but keep capability distinct for restricted coordinators/Editors. Recommend permanent guest deletion and guest access/path control Owner-only initially because they can erase records or aid browser-claim takeover. Current Admin has these powers; narrowing legacy Admin behavior must be explicitly approved, not hidden in a rename.*

Management RSVP records acting User, not guest impersonation. collaborators.manage Owner-only prevents inviting more managers or escalating to Owner. Sensitive settings covers future security/billing/integration/retention, not all current timing and RSVP settings.

Platform Standard User gets self-service/event.create and their own scope grants. Platform Administrator is distinct from Event Owner. Document/test current superAdmin operations during migration, but do not add blanket policy-before true that grants future delete/transfer. Owner-only powers remain Owner-only; exceptional support recovery needs a separate approved audited flow. No new platform-admin UI required now.

| Future organization ability | Org Owner | Org Administrator | Org Member |
|---|---|---|---|
| View org | Y | Y | Y while active |
| Staff/invite administration | Y | Y, protected Owner | N |
| Business settings | Y | Normal settings | N |
| Delete/transfer org | Y | N | N |
| Client Event access | Only explicit active Event grant | Same | Same |
| Client Event delete/transfer | Only if personally Event Owner | Same | Same |

Do not ship every role, per-user override inspector or general role engine in Phase 1. Future coordinator preset should be approved operation-by-operation, normally selected guests/seating/attendance without publish/guest trust/ownership powers.

## 10. Secure invitation and membership lifecycle — Audit G

This is a new administrative collaboration domain, not existing wedding Invitation/Guest/browser trust.

1. Authenticated Owner loads Event; API checks collaborators.manage against authoritative ownership. Validate canonical recipient email and allowed non-owner role; limit actor/Event/recipient/IP abuse. Do not disclose recipient account existence to unauthorized callers.
2. Lock Event, reject invalid/self-owner grants, retire expired pending rows, create one pending invitation. Generate 32 random bytes/base64url and store SHA-256 token hash only. Reuse existing guest token entropy pattern, not encrypted redisplay storage or guest semantics.
3. Deliver after transaction commit via approved trusted HTTPS frontend origin, not arbitrary Host/origin. Link is not membership. Retries/resend must not duplicate grants. Configure real mail/supervised worker or approved synchronous after-commit delivery; local log mailer is not ready delivery evidence.
4. Opening link is non-mutating; GET never accepts because mail scanners follow links. Minimize pre-auth information. Use no-referrer, no tracking, redacted logs, safe local return path. Keep token out of general notification metadata/analytics.
5. Existing User authenticates; new User registers and verifies invited inbox. Require current canonical email verified and exactly matching intended recipient. Wrong logged-in User gets safe mismatch/switch-account flow, never reassignment. Email change resets verification and invalidates matching acceptance.
6. Accept through authenticated CSRF-protected POST. Inside transaction, re-resolve User/token/Event/role/expiry/revocation/verified email. Lock Event → invite → target membership; use same order for revoke/role changes. Do not trust client event/email/role fields.
7. Create/reactivate unique Event/User membership, mark accepted_by_user_id/time, clear pending_slot, increment access revision and audit atomically. Preserve owner FK. Constraints arbitrate concurrent acceptance, not validation alone.
8. Lost-response retry may return idempotent success only for the same verified accepted User and still-active resulting membership; it never repeats grant. Wrong User denied. Accepted/revoked/expired token cannot reactivate revoked/left membership or change role/Event.
9. Owner revokes pending/active access; collaborator can leave. Owner cannot leave/demote/revoke themselves. Role change is Owner-only dedicated operation. Existing active member acceptance is documented no-op/conflict, never stale invite overwrite of current role.
10. Reissue invalidates old pending token and uses new hash. Fixed nullable pending slot uniqueness avoids duplicate active pending invitations; retire expiry inside acceptance/reissue even without worker. No pending/expired/revoked permissions.

Re-authorize every management request/resource response from live grants. Revocation should not log User out of other Events. Requests can race: sensitive mutations must recheck permission after shared Event lock, before commit. Operations committed before revocation remain valid; operations entering afterward deny. Already downloaded content cannot be erased remotely.

Audit invite/resend/accept/revoke/role-change/leave from first release, with actor identity and no raw token/secret. Delivery failure/resend cooldown must be visible without conferring access. Use minimal after-commit jobs/outbox only where durable delivery requires it, not a general event bus.

Future org invitations bind exactly one org scope; cannot activate Event membership. Event invites cannot imply org membership. Use separate token/table/route domains. Random tokens need secure hash comparison/storage and single use; no password-style expensive hashing requirement. [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) supports expiring single-use tokens and non-enumerating recovery responses.

## 11. Migration/backfill/deployment strategy — Audit H

**R; no live data was queried. Never use migrate:fresh, destructive resets, seeders or rewritten historical migrations on existing live data.**

1. Production read-only preflight: Owner counts per Event, invalid roles/orphans/canonical email collisions/verified coverage/legacy Admin/PATs, actual FK/indexes and production engine/version/collation. Confirm backup restore and engine-specific index/lock behavior.
2. Expand additively: nullable owner FK/index, membership lifecycle/indexes, new collaboration invitations/audits. Support Manager in API/Web before writing new role values. Backfill existing memberships active. Do not globally block old owners on verification.
3. Backfill owner only from exactly one validated Owner row. Batch/idempotently update, lock/revalidate against concurrent Event creation. Zero/multiple owners stop for approved remediation. Never guess MIN(user_id), oldest member or arbitrary superAdmin. Preserve IDs and snapshot JSON.
4. Compatible release: new Event creation writes FK + mirror transactionally. During expansion, controlled legacy-null fallback requires validated single Owner; use FK when present. All creating/access-writing instances must support this before non-null enforcement. Web schemas must accept new role/effective access first.
5. Capabilities before invites: cover all 56 routes, legacy aliases, V-only publication/creation, resource redaction and notification visibility. Owner normal operations preserved; legacy Admin narrowing approved. Locked current-grant rechecks serialize revocation with existing Event-first operations.
6. Verify every Event and all creators, then enforce non-null owner FK/restricted owner deletion. Validate role/status constraints against actual engine/data; enum casts are not DB constraints. Prevent mirror mutation that removes/demotes owner.
7. Deploy identity prerequisites and prove mail/worker operation. Require verified acceptance; decide verification for sending collaboration invites. Preserve legacy Event editing.
8. Enable Owner/Manager invitations for controlled cohort; verify conflict UX and guest/publication invariants, audit outcomes and delivery failures.
9. Normalize legacy admin only after all callers compatible. Do not remove Owner mirrors before owner-inclusive list/fanout coverage. No mass republish or snapshot backfill.

Rollback: disable collaboration mutation feature first and retain grants/audits/data. **Returning to today's EventPolicy after storing revoked/left rows is unsafe: it would grant them access because status is ignored.** Roll back only to a compatibility release that still filters lifecycle/capabilities. Retain additive schema while writers use it. Before any later schema contraction, verify Owner mirrors and preserve/export grant/audit data; prefer forward fix. Historical down migrations are not a production rollback plan.

## 12. Publishing and guest isolation — Audit I

**S:** PublishedWebsitePresentation::resolve reads active Event pointer and stored Website snapshot in one joined statement, validates Event/project IDs, filters visible/enabled content and public RSVP, and fails closed on malformed/missing snapshot. No draft fallback. Published/media reference validation is Event-scoped. PublishWebsite uses saved state and Event-first coordinator; snapshot/pointer replacement is transactional. Unpublish retains snapshot payload.

WebsiteDraftBoundary enforces revision; WebsitePublicationCoordinator locks Event → Website → Sections → media. Existing AtomicWebsiteDraftSaveTest and AtomicWebsitePublicationTest assertions cover stale/missing revisions, rollback and snapshot isolation. They do not currently coordinate collaborator revocation because that lifecycle is absent. Reuse their lock structure; keep optimistic editing conflicts, not an unapproved real-time merge system.

Public GET `/api/public/events/{slug}/site` and `/media/{asset}/web` are independent of management login and only serve published referenced content. Private guest context/site use link/browser proof, not Event membership. Guest mutation routes in routes/web.php have web-session CSRF and explicit throttles; guest tokens and browser credentials are separate.

**Private does not mean the entire site is password/login gated today.** ReadPrivateInvitationSite:17–51 returns published authored presentation for valid resolved tokens even when unclaimed/claimed_elsewhere, but attaches household RSVP only when trusted and not handoffOnly. ResolveInvitationTrustContext rejects unknown and untrusted historical links. Private-only media requires trusted browser and published reference (PrivateInvitationController::media:24–33); media present in public Sections uses public URLs. No separate guest password gate was found. Preserve these exact semantics.

Guest tokens: 32 random bytes, SHA-256 lookup, encrypted raw token for management redisplay. Browser secrets are hashed; InvitationTrustCookie is HttpOnly/lax, secure from configured session/production fallback, long-lived. These deliberate guest semantics must not become collaborator invitation semantics. SubmitPrivateInvitationRsvp requires current/trusted proof and rechecks credential under locks; management RSVP uses request User attribution.

Current management risk: InvitationResource exposes current guest path, all updatable members can reset/rotate. That can aid claiming guest browser access. Owner-only guest_access.manage must govern API reset/rotation, access audit and path serialization in every detail/create/update response loading the link, not merely buttons. A collaborator session must never directly substitute for a guest credential; a guest cookie must never authorize workspace API.

**R deployment invariants:** permissions/org memberships remain live management data, outside snapshots/guest contracts. Revocation does not unpublish, republish, rotate household links or deactivate guests. Management preview/media need website.view/media.view; these do not automatically mint guest trust. Preserve publish timestamp, pointer, Section/element IDs and revision behavior. Serve administrative media through current authorization; do not expose original storage permanently. Already legitimate public copies remain public.

Inspected guest coverage: API tests/Feature/PublicEventSiteTest.php, SnapshotGuestPresentationTest.php, PublishedWebsiteSnapshotTest.php, PublishedWebsiteSnapshotPersistenceTest.php, PrivateInvitationSiteTest.php, PrivateInvitationClaimTest.php, PrivateInvitationRsvpTest.php, InvitationAccessTransferTest.php and PrivateInvitationLinkRotationTest.php; Web src/features/publicEventSite/publicEventSitePage.test.tsx and privateEventSite/privateEventSite.test.tsx plus private link/reset tests. Not executed here.

## 13. Independently testable implementation phases

| Phase | Concrete scope | Gate |
|---|---|---|
| 1A: Authorization/ownership | Owner data preflight/FK/mirror, active lifecycle, explicit policy coverage, effective management response, central Web access context, notifications/redaction, owner/legacy compatibility | Current Owner unchanged; server capability denial/foreign IDs/revocation; safe rollback |
| 1B: Identity prerequisites | Verification/recovery/canonical uniqueness/abuse limits; actual mail and worker readiness | Identity mismatch/verification and delivery proven; legacy owners preserved |
| 2: Hazel collaboration | Owner invite/login/new registration/verify/accept; Manager only; revoke/leave/role change; minimal audits | Full two-account journey, expired/replay/concurrent/revoked cases, no guest privilege transfer |
| 3: Coordinator preset | Approved selected Event operations and response visibility | No unrelated client Events, ownership or unapproved publish/trust rights |
| 4: Organizations/teams | Separate org identity/membership/invites, owner-approved Event/team/staff assignment and grant origin | Staff/team removal affects appropriate grants only; couple ownership retained |
| 5: Advanced controls | Transfer, support recovery, richer audit retention/UI, overrides if justified | Step-up/consent/atomic Owner invariant and audited exceptions |

Refinement: identity readiness is a Phase 1 gate; access-change audit/atomic revocation ship with first access administration, not Phase 5. Owner delete/transfer abilities are designed now but need no first-release endpoints. Do not ship all role options or organization functionality prematurely.

## 14. Security verification plan — Audit J

No execution results claimed. Implementation verification should exercise all 56 routes with valid payload/revision as Owner, Manager, limited active role when introduced, pending invitation only, revoked/left member, outsider, unauthenticated browser, guest-cookie-only browser and platform support. Denied writes assert no database/storage/snapshot/pointer/revision changes.

API cases:

- Owner retains existing access; Manager normal operations succeed, delete/transfer/collaborator escalation fail.
- No membership cannot access administrative subresources; organization membership alone confers no Event rights.
- Substitute foreign projects/Sections/assets/variants/invitations/source/destination/Guests/roles, including a User legitimately in both Events to expose wrong nested lookup.
- Inject owner_user_id/user_id/role/status/organization/published pointer/verified timestamp; cannot alter authority.
- Read-only direct HTTP to publish/unpublish/create/initialize and legacy aliases is denied; UI hiding is insufficient.
- Private path redaction and guest_access.manage checked on detail/create/update/audit/reset/rotate; manager login never mints guest proof, guest proof never management access.
- Notifications/counts/fanout after revoke/downgrade obey current scope; other recipients remain isolated.
- Revocation applies next request without logout and preserves other Events. Accepted-token replay cannot reactivate access.
- Canonical email/collisions, verification mismatch, password recovery, session/CSRF, rate limits and platform role injection covered.

### Real database integration requirements

Use disposable same-engine/version database and separate connections/processes. SQLite/in-memory or sequential mock tests cannot prove production locks.

| Scenario | Required evidence |
|---|---|
| Owner migration | Zero/multiple quarantine, valid preserved backfill, repeated batches, simultaneous creation, non-null/FK enforcement |
| Owner lifecycle | User FK blocks deletion; leave/demotion/revoke protections; no arbitrary substitute Owner |
| Invite/accept concurrency | Pending uniqueness and Event/User uniqueness; two accepts yield one grant/accepted invitation |
| Revoke/expire/reissue race | Serialized grant decision; old token cannot activate; same-user retry no regrant |
| Role change/stale invite | Old invite cannot overwrite newer role |
| Mutation/revocation | Shared Event lock and in-transaction access recheck; before/after ordering defined |
| Editing/publishing/media | 428/409 conflict, one committed snapshot/pointer, rollback, referenced asset protection, post-commit cleanup |
| FKs/deletion | Membership/invite/audit indexes, Event cascades/RSVP restrict dependencies, model vs bulk deletion |
| Rollback compatibility | Revoked/left remains denied; data/audits preserved; snapshot/guest JSON unchanged |

Frontend automation: forbidden direct navigation, missing permissions fail closed, read-only preview, mutation 403/revocation cache invalidation, 401 safe return, 419 recovery, rapid delayed Event switching, unsaved conflict preservation, login/register/verification return flow and Desktop/Tablet/Mobile Owner/Manager navigation. Existing Web draft-save/project browser tests are reusable but do not prove capability matrix.

Manual staging: three accounts/two Events/separate guest browser. Complete Owner→Hazel invite→login/register→verify→accept→operate→leave/revoke. Wrong User, expired/reissued/revoked links and lost-response retries. Direct HTTP forbidden delete/transfer/role escalation. Check public/private sites and guest RSVP before/after revoke, draft isolation before republish, admin media and trust recovery. Verify actual HTTPS/cookies/stateful/CORS/CSRF, limit responses, no token log/referrer leakage, real delivery/retries/worker monitoring. No destructive tests against production.

This design follows least privilege, every-request checks and scope tests from [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html). Repository findings come from code, not the guidance.

## 15. Open product decisions

1. Manager publish/unpublish: recommended yes for Hazel, distinct capability; approve restricted coordinator differences.
2. Owner-only permanent guest deletion/private paths/reset/rotate/audit: approve and define compatibility/notification for legacy Admin powers.
3. Owner FK + compatibility mirror versus strengthened membership-only invariant; approved remediation for existing zero/multiple Owners.
4. Verification before sending invites as well as recipient acceptance: recommend both for new collaboration operations without blocking legacy editing.
5. Expiry/resend cooldown/pending limits/retry semantics/audit retention. Seven-day expiry would be a possible product choice, not an approved value.
6. Account deletion/owner succession/future transfer: step-up, consent and recovery rules.
7. Platform support scope and exceptional recovery; no silent superAdmin inheritance of Owner-only future powers.
8. Confirm Owner/Manager first and deferred Editor/Viewer/orgs; identify concrete team workflow that would justify Option B.
9. Production provider/sender/worker ownership and delivery reliability; log mailer is not proof.
10. Future multi-team assignment, staff approval, direct/derived grants and separate business-owned Events.
11. SPA-only management or supported PAT issuance; logout/token lifecycle rules.

These are later design approvals. This audit does not authorize implementation.

## 16. Exact source evidence and audit verification

| Topic | Exact anchors under repository roots |
|---|---|
| Auth schema/normalization | API database/migrations/0001_01_01_000000_create_users_table.php:14–23; app/Models/User.php:5,16,47; app/Http/Requests/Auth/RegisterRequest.php:16,24; LoginRequest.php:15,22; app/Http/Controllers/AuthController.php:18,35,48; app/Http/Resources/UserResource.php::toArray |
| Auth middleware/PAT | API bootstrap/app.php::withMiddleware; config/auth.php, session.php, sanctum.php, cors.php; vendor/laravel/framework/src/Illuminate/Foundation/Configuration/Middleware.php::getMiddlewareGroups; vendor/laravel/sanctum/src/Guard.php::__invoke; Web src/lib/api/client.ts::apiRequest; csrf.ts::ensureCsrfCookie |
| Ownership/membership | API database/migrations/2026_08_13_000000_create_events_table.php::up; 2026_08_13_000001_create_event_memberships_table.php:11–18; app/Actions/Events/CreateEvent.php:18–36; app/Models/EventMembership.php::casts; app/Enums/EventMembershipRole.php; app/Policies/EventPolicy.php:10–18 |
| Event list/detail | API app/Http/Controllers/EventController.php::index,show; app/Http/Resources/EventResource.php::membershipRole; Web src/features/events/eventsApi.ts::getMyEvents,getEvent; schemas.ts:23–24; EventCard.tsx:40 |
| Website boundaries | API app/Http/Controllers/WebsiteDraftController.php:73,80,455,463,485; app/Http/Middleware/WebsiteDraftBoundary.php:16–41; app/Actions/Websites/SaveWebsiteDraft.php::handle; app/Http/Requests/SaveWebsiteDraftRequest.php::rules,after; app/Website/Publishing/WebsitePublicationCoordinator.php:23,43,52 |
| Guest data scope | API app/Http/Controllers/InvitationController.php::authorizedEvent,invitation,move; app/Actions/Invitations/UpdateInvitation.php::handle; MoveGuest.php::handle; ResolveWeddingRoles.php::existing; app/Http/Requests/InvitationStateRequest.php::rules,invitationState; UpdateInvitationRsvp.php::handle |
| Guest trust exposure | API app/Http/Resources/InvitationResource.php::toArray; app/Actions/Invitations/ResetInvitationTrustedAccess.php::handle; RotatePrivateInvitationLink.php::handle; Web src/features/invitations/components/InvitationsResults.tsx:36–37; src/pages/workspace/InvitationsPage.tsx::copyInvitationLink,confirmMutation |
| Media | API app/Http/Controllers/MediaAssetController.php:65,73; app/Actions/Media/UploadMediaAsset.php::handle; DeleteMediaAsset.php::handle,deleteLocked; DeliverMediaVariant.php::handle; app/Website/Publishing/WebsitePublicationMediaRule.php; config/media.php, filesystems.php |
| Notifications | API app/Actions/Notifications/RecordManagementNotifications.php:24–26; app/Http/Controllers/NotificationController.php:14,24,36,47; app/Http/Resources/UserNotificationResource.php::toArray; database/migrations/2026_09_24_140000_create_user_notifications.php |
| Guest isolation | API app/Actions/Invitations/ReadPrivateInvitationSite.php:17–51; ResolveInvitationTrustContext.php::handle,proves; OpenPrivateInvitation.php::handle; SubmitPrivateInvitationRsvp.php:26–38; app/Http/Controllers/PrivateInvitationController.php:24–33; app/Invitations/InvitationTrustCookie.php::make; PrivateInvitationToken.php::generate,hash; app/Models/InvitationPrivateLink.php::casts,path; routes/web.php |
| Snapshot/publishing | API app/Website/Publishing/PublishedWebsitePresentation.php::resolve,website,mediaIds; app/Actions/Websites/PublishWebsite.php::handle; UnpublishWebsite.php::handle; database/migrations/2026_09_22_000000_add_published_website_to_events.php; 2026_10_09_000000_add_published_snapshot_to_websites.php; 2026_10_09_010000_add_draft_revision_to_websites.php |
| Workspace/auth journey | Web src/app/router.tsx; src/features/auth/RouteGuards.tsx::ProtectedRoute,GuestRoute; AuthProvider.tsx::restoreInitialSession,refreshUser; src/features/events/workspace/EventWorkspaceLayout.tsx; useEventDetail.ts:9–47; EventWorkspaceNavigation.tsx; src/pages/LoginPage.tsx::intendedPath; RegisterPage.tsx::onSubmit; src/pages/workspace/WebsitePreviewPage.tsx; src/features/websiteEditor/useWebsiteDraft.ts |
| FKs/deletion | API app/Models/Event.php::booted; database/migrations/2026_09_21_000000_create_invitations_domain.php; 2026_09_23_100000_create_operational_rsvp_domain.php; 2026_08_17_000000_create_media_assets_table.php; 2026_09_24_130000_create_invitation_access_audits.php |
| Delivery/tests | API config/mail.php, queue.php; .env.example; composer.json dev/test scripts; phpunit.xml; only selected non-secret local driver values inspected |

56/56 authenticated Event route declarations inventoried; ancillary authenticated and guest paths documented separately. Existing assertions were inspected without invented results. No runtime readiness, production data integrity or migration outcome is claimed. Only Web/docs/identity-membership-authorization-audit.md added; prior footer files and API tree preserved.

KIRITA IDENTITY & AUTHORIZATION PHASE 0 COMPLETE
