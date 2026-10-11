import { ArrowLeft, FileWarning, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import {
  EventWorkspaceError,
  EventWorkspaceLoading,
} from "../../features/events/workspace/EventWorkspaceState";
import { useEventDetail } from "../../features/events/workspace/useEventDetail";
import { useEditorDeviceCategory } from "../../features/websiteEditor/responsiveViewport";
import { useWebsiteDraft } from "../../features/websiteEditor/useWebsiteDraft";
import { WebsiteRenderer } from "../../features/websiteRenderer/WebsiteRenderer";
import { DEFAULT_RSVP_EDITOR_PREVIEW_STATE } from "../../features/websiteRenderer/rsvpEditorPreview";
import { ApiError } from "../../lib/api";

function draftErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "We couldn’t load the saved Website draft.";
}

export function WebsitePreviewPage() {
  const { eventId = "", projectId = "" } = useParams();
  const eventResult = useEventDetail(eventId);
  const draftResult = useWebsiteDraft(eventId, projectId);
  const targetViewport = useEditorDeviceCategory();

  if (eventResult.isLoading) return <EventWorkspaceLoading focused />;
  if (eventResult.error)
    return (
      <EventWorkspaceError
        error={eventResult.error}
        retry={eventResult.retry}
      />
    );
  if (!eventResult.event) return null;
  if (draftResult.isLoading) return <PreviewLoading />;
  if (draftResult.isUninitialized)
    return (
      <PreviewState
        eventId={eventId}
        projectId={projectId}
        title="Website not initialized"
        message="This Website Project has invalid or unsupported Template metadata."
      />
    );
  if (draftResult.error || !draftResult.draft)
    return (
      <PreviewState
        eventId={eventId}
        projectId={projectId}
        title="Unable to load Website preview"
        message={draftErrorMessage(draftResult.error)}
        onRetry={draftResult.retry}
      />
    );

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      <Link
        className="fixed left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] z-50 inline-flex min-h-9 items-center gap-2 rounded-sm border border-border/80 bg-surface/90 px-3 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-dialog)] backdrop-blur-md transition-colors hover:bg-surface"
        to={`/events/${eventId}/websites/${projectId}`}
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to Builder
      </Link>
      <WebsiteRenderer
        event={eventResult.event}
        website={draftResult.draft}
        mode="public"
        targetViewport={targetViewport}
        audience="management-preview"
        rsvpEditorPreviewState={DEFAULT_RSVP_EDITOR_PREVIEW_STATE}
      />
    </main>
  );
}

function PreviewLoading() {
  return (
    <main
      className="min-h-svh animate-pulse bg-surface-muted"
      aria-label="Loading Website preview"
    >
      <div className="h-[70svh] bg-surface" />
      <div className="mx-auto mt-10 h-6 w-48 rounded bg-surface" />
      <div className="mx-auto mt-4 h-4 w-72 max-w-[80%] rounded bg-surface" />
    </main>
  );
}

function PreviewState({
  eventId,
  projectId,
  title,
  message,
  onRetry,
}: {
  eventId: string;
  projectId: string;
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
        <FileWarning className="mx-auto text-secondary-accent" aria-hidden="true" />
        <Heading className="mt-3" level={1} variant="panel">
          {title}
        </Heading>
        <Text className="mt-2" variant="muted">
          {message}
        </Text>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-border px-3.5 py-2 text-sm font-medium hover:bg-surface-muted"
            to={`/events/${eventId}/websites/${projectId}`}
          >
            <ArrowLeft aria-hidden="true" size={16} /> Back to Builder
          </Link>
          {onRetry && (
            <Button type="button" onClick={onRetry}>
              <RefreshCw aria-hidden="true" size={16} /> Try again
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
