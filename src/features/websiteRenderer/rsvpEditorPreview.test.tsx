import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RsvpEditorPreview } from "./RsvpEditorPreviewRenderer";
import {
  createRsvpEditorPreviewModel,
  DEFAULT_RSVP_EDITOR_PREVIEW_STATE,
  RSVP_EDITOR_PREVIEW_STATES,
  RSVP_EDITOR_SAMPLE_LAST_UPDATED,
} from "./rsvpEditorPreview";

describe("editor-safe RSVP preview", () => {
  it("offers the exact six ephemeral preview states and defaults to partial", () => {
    expect(RSVP_EDITOR_PREVIEW_STATES).toEqual([
      { value: "form-pending", label: "Form - Pending" },
      { value: "form-partial", label: "Form - Partial" },
      { value: "completed", label: "Completed" },
      { value: "closed", label: "Closed" },
      { value: "deadline-passed", label: "Deadline passed" },
      { value: "inactive", label: "Inactive" },
    ]);
    expect(DEFAULT_RSVP_EDITOR_PREVIEW_STATE).toBe("form-partial");
  });

  it("builds deterministic, private-data-free sample projections", () => {
    const pending = createRsvpEditorPreviewModel("form-pending");
    const partial = createRsvpEditorPreviewModel("form-partial");
    expect(
      pending.guests.map(({ id, name, response }) => ({ id, name, response })),
    ).toEqual([
      { id: "rsvp-preview-alex", name: "Alex Santos", response: null },
      { id: "rsvp-preview-jamie", name: "Jamie Santos", response: null },
    ]);
    expect(partial).toMatchObject({
      status: "partial",
      availability: "open",
      attendingCount: 1,
      declinedCount: 0,
      pendingCount: 1,
    });
    expect(partial.guests.map(({ response }) => response)).toEqual([
      "attending",
      null,
    ]);
    expect(createRsvpEditorPreviewModel("form-partial")).toEqual(partial);
  });

  it.each([
    ["completed", "open"],
    ["closed", "event_closed"],
    ["deadline-passed", "deadline_passed"],
    ["inactive", "invitation_inactive"],
  ] as const)(
    "maps %s to the shared runtime contract",
    (state, availability) => {
      expect(createRsvpEditorPreviewModel(state)).toMatchObject({
        status: "complete",
        availability,
        attendingCount: 1,
        declinedCount: 1,
        pendingCount: 0,
        lastUpdated: RSVP_EDITOR_SAMPLE_LAST_UPDATED,
      });
    },
  );

  it("renders through the shared functional presentation without private runtime context", () => {
    const markup = renderToStaticMarkup(
      <RsvpEditorPreview
        state="form-partial"
        environment={{
          templateKey: "classic-filipiniana-v1",
          viewport: "mobile",
        }}
      />,
    );
    expect(markup).toContain("data-rsvp-editor-preview");
    expect(markup).toContain("data-rsvp-shared-presentation");
    expect(markup).toContain("Alex Santos");
    expect(markup).toContain("Jamie Santos");
    expect(markup).toContain('name="rsvp-rsvp-preview-alex"');
    expect(markup).toContain("Submit RSVP");
    expect(markup).toContain("w-full");
    expect(markup).not.toContain("invitationToken");
    expect(markup).not.toContain("accessCode");
    expect(markup).toContain("Partial");
    expect(markup).not.toContain("1 attending");
    expect(markup).not.toContain("1 pending");
  });

  it.each([
    ["form-pending", "Pending", ["0 attending", "2 pending"]],
    ["form-partial", "Partial", ["1 attending", "1 pending"]],
    ["completed", "Complete", ["1 attending", "1 declined", "0 pending"]],
  ] as const)("omits aggregate counts from the %s sample", (state, heading, counts) => {
    const markup = renderToStaticMarkup(
      <RsvpEditorPreview state={state} environment={{ templateKey: "classic-filipiniana-v1" }} />,
    );
    expect(markup).toContain(heading);
    for (const count of counts) expect(markup).not.toContain(count);
    expect(markup).toContain("Alex Santos");
    expect(markup).toContain("Jamie Santos");
  });

  it("renders read-only sample states and runtime-owned copy via the shared renderer", () => {
    const closed = renderToStaticMarkup(
      <RsvpEditorPreview
        state="closed"
        environment={{ templateKey: "modern-editorial-v1" }}
      />,
    );
    expect(closed).toContain("RSVP responses are closed.");
    expect(closed).not.toContain("<form");

    const complete = renderToStaticMarkup(
      <RsvpEditorPreview
        state="completed"
        environment={{ templateKey: "modern-editorial-v1" }}
      />,
    );
    expect(complete).toContain("Update RSVP");
    expect(complete).toContain("data-rsvp-shared-presentation");
  });
});
