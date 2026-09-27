import { ClassicFoundationOrnament } from "./decorations";
import { SectionContentInset } from "../../SectionContentInset";
import { PrivateRsvpRuntime } from "../../PrivateRsvpRuntime";
import type { RsvpPresentationEnvironment } from "../../rsvpPresentationResolution";
import { RsvpEditorPreview } from "../../RsvpEditorPreviewRenderer";
import type { RsvpEditorPreviewState } from "../../rsvpEditorPreview";

export function ClassicFilipinianaGallery({
  collection,
}: {
  sectionId: string;
  collection: React.ReactNode;
}) {
  return (
    <ContentSection
      heading={null}
      headingParticipates={false}
      foundationOrnamentParticipates={false}
    >
      {collection}
    </ContentSection>
  );
}

export function ClassicFilipinianaRsvp({
  presentationEnvironment,
  editorPreviewState,
  privateRuntime,
}: {
  presentationEnvironment?: RsvpPresentationEnvironment;
  editorPreviewState?: RsvpEditorPreviewState;
  privateRuntime: boolean;
}) {
  if (editorPreviewState) return <RsvpEditorPreview key={editorPreviewState} state={editorPreviewState} environment={presentationEnvironment ?? {}} />;
  return privateRuntime ? <PrivateRsvpRuntime presentationEnvironment={presentationEnvironment}>{null}</PrivateRsvpRuntime> : null;
}

function ContentSection({
  eyebrow,
  heading,
  children,
  eyebrowParticipates,
  foundationOrnamentParticipates = true,
  headingParticipates = true,
  bodyParticipates = true,
  renderFlow,
  specializedClassName = "",
}: {
  eyebrow?: React.ReactNode;
  heading: React.ReactNode;
  children: React.ReactNode;
  eyebrowParticipates?: boolean;
  foundationOrnamentParticipates?: boolean;
  headingParticipates?: boolean;
  bodyParticipates?: boolean;
  renderFlow?: (specialized: React.ReactNode) => React.ReactNode;
  specializedClassName?: string;
}) {
  const hasEyebrow = eyebrowParticipates ?? Boolean(eyebrow);
  return (
    <SectionContentInset
      className={renderFlow ? "" : "relative overflow-hidden"}
    >
      {(() => {
        const specialized = (
          <div
            data-section-specialized-content
            className={`relative mx-auto max-w-5xl overflow-hidden text-center ${specializedClassName}`}
          >
            {foundationOrnamentParticipates && (
              <ClassicFoundationOrnament className="mx-auto mb-5 h-5 w-32 opacity-75" />
            )}
            {hasEyebrow && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--cf-secondary)]">
                {eyebrow}
              </p>
            )}
            {headingParticipates && (
              <h2
                data-section-heading
                className={`mx-auto w-full max-w-2xl font-[family-name:var(--cf-heading-font)] text-3xl leading-tight text-[var(--cf-text)] sm:text-4xl ${hasEyebrow ? "mt-3" : ""}`}
              >
                {heading}
              </h2>
            )}
            {bodyParticipates && (
              <div
                data-section-body
                className={`mx-auto text-sm leading-7 text-[var(--cf-muted)] ${hasEyebrow || headingParticipates ? "mt-8" : ""}`}
              >
                {children}
              </div>
            )}
          </div>
        );
        return renderFlow ? renderFlow(specialized) : specialized;
      })()}
    </SectionContentInset>
  );
}
