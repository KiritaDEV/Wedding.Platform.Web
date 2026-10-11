import type { PrivateInvitationRuntime } from "../privateEventSite/api";

export const RSVP_EDITOR_PREVIEW_STATES = [
  { value: "form-pending", label: "Form - Pending" },
  { value: "form-partial", label: "Form - Partial" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
  { value: "deadline-passed", label: "Deadline passed" },
  { value: "inactive", label: "Inactive" },
] as const;

export type RsvpEditorPreviewState =
  (typeof RSVP_EDITOR_PREVIEW_STATES)[number]["value"];
export const DEFAULT_RSVP_EDITOR_PREVIEW_STATE: RsvpEditorPreviewState =
  "form-partial";
export const RSVP_EDITOR_SAMPLE_LAST_UPDATED = "2026-06-15T10:30:00.000Z";

type RsvpProjection = NonNullable<PrivateInvitationRuntime["rsvp"]>;

export function createRsvpEditorPreviewModel(
  state: RsvpEditorPreviewState,
): RsvpProjection {
  if (state === "form-pending")
    return projection("pending", "open", null, null);
  if (state === "form-partial")
    return projection("partial", "open", "attending", null);
  const availability =
    state === "closed"
      ? "event_closed"
      : state === "deadline-passed"
        ? "deadline_passed"
        : state === "inactive"
          ? "invitation_inactive"
          : "open";
  return projection(
    "complete",
    availability,
    "attending",
    "declined",
    RSVP_EDITOR_SAMPLE_LAST_UPDATED,
  );
}

function projection(
  status: RsvpProjection["status"],
  availability: RsvpProjection["availability"],
  alex: "attending" | "declined" | null,
  jamie: "attending" | "declined" | null,
  lastUpdated: string | null = null,
): RsvpProjection {
  const guests = [
    { id: "rsvp-preview-alex", name: "Juan Dela Cruz", response: alex },
    { id: "rsvp-preview-jamie", name: "Aurora Dela Cruz", response: jamie },
  ];
  return {
    status,
    availability,
    attendingCount: guests.filter(({ response }) => response === "attending")
      .length,
    declinedCount: guests.filter(({ response }) => response === "declined")
      .length,
    pendingCount: guests.filter(({ response }) => response === null).length,
    lastUpdated,
    guests,
  };
}
