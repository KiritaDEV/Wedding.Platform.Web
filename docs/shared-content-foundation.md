# Section-owned shared content

Only Schedule opts into this contract. Other Blocks retain their existing content ownership.

Draft Section content may contain `sharedContentDefinitions: [{ id, type: "schedule", content: { days } }]`. IDs are scoped to the owning Section. Day and Activity IDs are unique within their Schedule content. A Schedule placement has its normal `id`, `editorName`, `isHidden`, and `appearance`, plus exactly one of `days` (local content) or `contentId` (shared content). A definition contains no placements, references, appearance, credentials, guest data, or temporary delivery URLs. Activities may contain validated map links. Cycles are impossible in the accepted semantic shape.

Definitions and all composition branches travel together in the existing Section content JSON and aggregate Save Draft. There is no separate persistence endpoint or database migration. The client removes orphan definitions during placement deletion/device reset; the server rejects orphans and dangling references rather than silently losing content. Hidden and disabled placements count as references for draft validation and snapshot retention.

New Schedule creation opts in at the authored composition edit boundary. Device customization regenerates placement identities but preserves content references. Content edits update the owning definition; appearance edits update only the selected placement. Explicit Block/Group duplication creates a new definition once per distinct copied content ID. Section duplication remaps definitions once across all branches. Moving an existing placement within its Section retains content identity. Cross-Section movement is not introduced.

Published JSON stores definitions once, in the top-level `sharedContentDefinitions` collection, with `sectionId` identifying the owner. Section composition trees retain references and contain no duplicate definition collection. The strict reader temporarily attaches definitions to their owning Section to validate the aggregate; it returns the same storage representation. Guest presentation attaches only definitions used by visible placements in enabled, audience-allowed Sections. Renderers resolve against this validated presentation, never against mutable draft records. The Web storage decoder likewise returns a detached validated view with owned definitions attached for existing Section rendering contracts.

Media providers receive resolved semantic Schedule content with its placement ID and composition scope through the existing canonical extractor. Activity imageMediaId references use the Schedule media provider; draft validation, snapshot manifests, retained usage, and guest filtering use the same extractor. Hidden content remains retained, while guest media references require visible Days and titled visible Activities. No image picker or image renderer is provided.

## Existing local Schedule conversion

Flat Schedules are no longer accepted. An explicitly reviewed one-time development conversion maps each flat definition to one undated Day while preserving definition, placement, reference, and Activity IDs. Local days-based Schedules remain deliberately local Blocks; no read-time legacy adapter or schema version is added.

To opt in an existing placement, save pending edits, select its Schedule content inspector, and choose **Share Schedule content across device placements**. Review and Save Draft. This preserves the placement ID, entries, appearance, and other device branches. Subsequent device customization from the shared branch preserves the new content ID.

Existing custom device copies are not implicitly linked or overwritten. They remain local with their divergent data intact. Opting in each copy separately creates independent definitions. Consolidating divergent copies into a single definition is a deliberate future/user-controlled operation, not part of this phase. Republish explicitly to update published content.

## Manual acceptance

1. Create Schedule in Blank and Hero; add/edit Days and Activities, save, and reload.
2. Customize tablet/mobile: placement IDs differ, content ID remains shared. Edit on mobile and verify the other referenced placements update.
3. Change one placement's spacing, visibility, and name; verify sibling appearance and metadata remain unchanged.
4. Duplicate Schedule and a nested Group containing repeated references; edits affect only the new definitions.
5. Duplicate the Section; verify new definitions and placement IDs across all branches.
6. Move within supported Section/Group boundaries, delete one placement, and reset a custom branch; content survives while another placement references it.
7. Save from two tabs; stale save returns 409 and preserves local input. Reload and verify content/appearance were saved together.
8. Publish, edit the draft, and inspect public/private sites: published content remains frozen until republishing.
9. Hide Schedule/parent Group or disable its Section; guests receive neither the placement nor definitions used only by hidden content.
10. Convert divergent existing local device copies independently and verify that neither copy is overwritten.
11. Repeat existing Media, RSVP trust, Group, and device preview workflows.

Real parallel MySQL concurrency remains a publishing deployment verification prerequisite; SQLite tests do not prove row-lock behavior.
