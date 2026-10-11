import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
} from "../../../components/ui/Dialog";
import { ApiError } from "../../../lib/api";
import {
  getInvitation,
  getInvitationRsvpHistory,
  updateInvitationRsvp,
} from "../api";
import { guestFullName } from "../invitationForm";
import type {
  GuestRsvpStatus,
  Invitation,
  InvitationListItem,
  RsvpSubmissionEntry,
} from "../types";

type Draft = Record<string, GuestRsvpStatus>;

function responseOf(value: "attending" | "declined" | null): GuestRsvpStatus {
  return value ?? "pending";
}
function payloadResponse(
  value: GuestRsvpStatus,
): "attending" | "declined" | null {
  return value === "pending" ? null : value;
}
function label(value: GuestRsvpStatus): string {
  return value[0].toUpperCase() + value.slice(1);
}

function buildDraft(invitation: Invitation): Draft {
  return Object.fromEntries(
    invitation.guests
      .filter((guest) => guest.status === "active")
      .map((guest) => [guest.id, responseOf(guest.rsvpResponse)]),
  );
}

export function ManageRsvpDialog({
  open,
  eventId,
  invitation,
  onClose,
  onSaved,
}: {
  open: boolean;
  eventId: string;
  invitation: InvitationListItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<Invitation | null>(null);
  const [initial, setInitial] = useState<Draft>({});
  const [draft, setDraft] = useState<Draft>({});
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [history, setHistory] = useState<RsvpSubmissionEntry[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadCurrent = useCallback(
    async (signal?: AbortSignal) => {
      if (!invitation) return;
      const current = await getInvitation(eventId, invitation.id, signal);
      const next = buildDraft(current);
      setDetail(current);
      setInitial(next);
      setDraft(next);
      setNote("");
    },
    [eventId, invitation],
  );

  const loadHistory = useCallback(
    async (signal?: AbortSignal) => {
      if (!invitation) return;
      const result = await getInvitationRsvpHistory(
        eventId,
        invitation.id,
        undefined,
        signal,
      );
      setHistory(result.data);
      setHistoryCursor(result.meta.nextCursor);
    },
    [eventId, invitation],
  );

  useEffect(() => {
    if (!open || !invitation) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      setDetail(null);
      loadCurrent(controller.signal)
        .catch((reason: unknown) => {
          if (!(reason instanceof DOMException && reason.name === "AbortError"))
            setError(
              reason instanceof ApiError
                ? reason.message
                : "Unable to load this Invitation.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      setHistoryLoading(true);
      setHistoryError(null);
      setHistory([]);
      setHistoryCursor(null);
      loadHistory(controller.signal)
        .catch((reason: unknown) => {
          if (!(reason instanceof DOMException && reason.name === "AbortError"))
            setHistoryError(
              reason instanceof ApiError
                ? reason.message
                : "Unable to load RSVP history.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setHistoryLoading(false);
        });
    });
    return () => controller.abort();
  }, [invitation, loadCurrent, loadHistory, open, reload]);

  const activeGuests = useMemo(
    () => detail?.guests.filter((guest) => guest.status === "active") ?? [],
    [detail],
  );
  const changed = activeGuests.some(
    (guest) => draft[guest.id] !== initial[guest.id],
  );
  const counts = activeGuests.reduce(
    (result, guest) => ({
      ...result,
      [draft[guest.id] ?? "pending"]: result[draft[guest.id] ?? "pending"] + 1,
    }),
    { attending: 0, declined: 0, pending: 0 },
  );
  const household =
    counts.pending === activeGuests.length
      ? "Pending"
      : counts.pending > 0
        ? "Partial"
        : "Complete";

  async function loadMoreHistory() {
    if (!invitation || !historyCursor || historyLoading) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const result = await getInvitationRsvpHistory(
        eventId,
        invitation.id,
        historyCursor,
      );
      setHistory((current) => [...current, ...result.data]);
      setHistoryCursor(result.meta.nextCursor);
    } catch (reason) {
      setHistoryError(
        reason instanceof ApiError
          ? reason.message
          : "Unable to load more RSVP history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function save() {
    if (!invitation || !detail || !changed || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await updateInvitationRsvp(
        eventId,
        invitation.id,
        activeGuests.map((guest) => ({
          guestId: guest.id,
          response: payloadResponse(draft[guest.id]),
        })),
        note.trim() || null,
      );
      onSaved();
      onClose();
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        reason.isValidationError &&
        reason.validationErrors.responses
      ) {
        try {
          await Promise.all([loadCurrent(), loadHistory()]);
        } catch {
          /* retain the actionable stale-roster message */
        }
        setError(
          "The guest list changed. Review the latest RSVP before saving again.",
        );
      } else if (reason instanceof ApiError && reason.status === 0) {
        try {
          await Promise.all([loadCurrent(), loadHistory()]);
        } catch {
          /* retain the ambiguous-result message */
        }
        setError(
          "The result could not be confirmed. Review the latest RSVP before saving again.",
        );
      } else {
        setError(
          reason instanceof ApiError
            ? reason.message
            : "Unable to update RSVP. Your draft has been preserved.",
        );
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeDisabled={saving}
      titleId="manage-rsvp-title"
      descriptionId="manage-rsvp-description"
      size="xl"
      contained
      mobileFullScreen
      className="h-[min(90dvh,900px)] max-w-4xl"
    >
      <div className="flex h-full min-h-0 flex-col">
        <DialogHeader
          className="shrink-0 border-b border-border px-5 py-4 sm:px-6"
          title="Manage RSVP"
          titleId="manage-rsvp-title"
          description={invitation?.effectiveName}
          descriptionId="manage-rsvp-description"
          onClose={onClose}
          closeDisabled={saving}
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {loading && (
            <p role="status" className="text-sm text-foreground-muted">
              Loading RSVP…
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-danger-muted p-3 text-sm text-danger"
            >
              {error}
              {!detail && (
                <Button
                  className="ml-2"
                  size="sm"
                  variant="secondary"
                  onClick={() => setReload((value) => value + 1)}
                >
                  Try again
                </Button>
              )}
            </div>
          )}
          {detail && (
            <>
              <section aria-labelledby="current-rsvp-heading">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 id="current-rsvp-heading" className="font-semibold">
                      Current responses
                    </h3>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {household} · {counts.attending} attending ·{" "}
                      {counts.declined} declined · {counts.pending} pending
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {activeGuests.map((guest) => (
                    <fieldset
                      key={guest.id}
                      className="min-w-0 rounded-lg border border-border p-4"
                    >
                      <legend className="max-w-full truncate px-1 text-sm font-semibold">
                        {guestFullName(guest)}
                      </legend>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {(["pending", "attending", "declined"] as const).map(
                          (response) => (
                            <label
                              key={response}
                              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${draft[guest.id] === response ? "border-accent bg-accent/10" : "border-border"}`}
                            >
                              <input
                                type="radio"
                                name={`rsvp-${guest.id}`}
                                value={response}
                                checked={draft[guest.id] === response}
                                disabled={saving}
                                onChange={() =>
                                  setDraft((current) => ({
                                    ...current,
                                    [guest.id]: response,
                                  }))
                                }
                              />
                              {label(response)}
                            </label>
                          ),
                        )}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <label
                  className="mt-5 block text-sm font-medium"
                  htmlFor="management-rsvp-note"
                >
                  Internal note{" "}
                  <span className="font-normal text-foreground-muted">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="management-rsvp-note"
                  className="mt-1 min-h-24 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
                  maxLength={1000}
                  value={note}
                  disabled={saving}
                  onChange={(event) => setNote(event.target.value)}
                />
                <p className="mt-1 text-xs text-foreground-muted">
                  Visible only to Event management. A note is saved only when a
                  response changes.
                </p>
              </section>
              <section
                className="mt-7 border-t border-border pt-6"
                aria-labelledby="rsvp-history-heading"
              >
                <h3 id="rsvp-history-heading" className="font-semibold">
                  RSVP history
                </h3>
                {historyLoading && history.length === 0 && (
                  <p
                    role="status"
                    className="mt-3 text-sm text-foreground-muted"
                  >
                    Loading RSVP history…
                  </p>
                )}
                {historyError && history.length === 0 && (
                  <div
                    role="alert"
                    className="mt-3 rounded-lg bg-danger-muted p-3 text-sm text-danger"
                  >
                    {historyError}{" "}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setReload((value) => value + 1)}
                    >
                      Try again
                    </Button>
                  </div>
                )}
                {!historyLoading && !historyError && history.length === 0 && (
                  <p className="mt-3 text-sm text-foreground-muted">
                    No RSVP history yet.
                  </p>
                )}
                {history.length > 0 && (
                  <ol className="mt-3 divide-y divide-border">
                    {history.map((entry) => (
                      <li key={entry.id} className="py-4 first:pt-0">
                        <div className="flex flex-wrap justify-between gap-2">
                          <strong className="text-sm">
                            {entry.actorType === "management_user"
                              ? (entry.actorName ?? "Event management")
                              : "Private invitation"}
                          </strong>
                          <time
                            className="text-xs text-foreground-muted"
                            dateTime={entry.createdAt}
                          >
                            {new Intl.DateTimeFormat(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(entry.createdAt))}
                          </time>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {entry.items.map((item, index) => (
                            <li
                              key={`${entry.id}-${item.guestId}-${index}`}
                              className="text-sm"
                            >
                              <span className="font-medium">
                                {item.guestName}
                              </span>{" "}
                              - {label(responseOf(item.response))}
                            </li>
                          ))}
                        </ul>
                        {entry.note && (
                          <p className="mt-2 text-sm">
                            <span className="font-medium">Note:</span>{" "}
                            {entry.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
                {historyError && history.length > 0 && (
                  <p role="alert" className="mt-3 text-sm text-danger">
                    {historyError}
                  </p>
                )}
                {historyCursor && (
                  <Button
                    className="mt-3"
                    variant="secondary"
                    disabled={historyLoading}
                    onClick={() => {
                      void loadMoreHistory();
                    }}
                  >
                    {historyLoading ? "Loading…" : "Load more"}
                  </Button>
                )}
              </section>
            </>
          )}
        </div>
        <DialogFooter className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!detail || !changed || saving}
            onClick={() => {
              void save();
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
