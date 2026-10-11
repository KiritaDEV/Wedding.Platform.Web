import { useState } from "react";
import type { RsvpDraft } from "../privateEventSite/rsvpForm";
import { RsvpFormPresentation } from "./RsvpPresentation";
import { resolveRsvpPresentation, type RsvpPresentationEnvironment } from "./rsvpPresentationResolution";
import { createRsvpEditorPreviewModel, type RsvpEditorPreviewState } from "./rsvpEditorPreview";

export function RsvpEditorPreview({ state, environment }: { state: RsvpEditorPreviewState; environment: RsvpPresentationEnvironment }) {
  const model = createRsvpEditorPreviewModel(state);
  const initialDraft = () => Object.fromEntries(model.guests.map(({ id, response }) => [id, response])) as RsvpDraft;
  const [draft, setDraft] = useState<RsvpDraft>(initialDraft);

  return <div data-rsvp-editor-preview data-rsvp-editor-preview-state={state} aria-label="Sample RSVP preview">
    <RsvpFormPresentation
      rsvp={model}
      presentation={resolveRsvpPresentation(environment)}
      environment={environment}
      draft={draft}
      editingExisting={false}
      confirmation={null}
      message={null}
      submitting={false}
      onChoice={(guestId, response) => setDraft({ ...draft, [guestId]: response })}
      onSubmit={(event) => event.preventDefault()}
      onEdit={() => undefined}
    />
  </div>;
}
