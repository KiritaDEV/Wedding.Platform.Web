import { SectionContentInset } from "../../SectionContentInset";
import { PrivateRsvpRuntime } from "../../PrivateRsvpRuntime";
import type { RsvpPresentationEnvironment } from "../../rsvpPresentationResolution";
import { RsvpEditorPreview } from "../../RsvpEditorPreviewRenderer";
import type { RsvpEditorPreviewState } from "../../rsvpEditorPreview";

export function ModernEditorialGallery({
  collection,
}: {
  sectionId: string;
  collection: React.ReactNode;
}) {
  return (
    <EditorialSection
      number={null}
      editorialRail
      containLongContent
      heading={null}
      headingParticipates={false}
    >
      {collection}
    </EditorialSection>
  );
}
export function ModernEditorialRsvp({
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

function EditorialSection({
  number,
  eyebrow,
  heading,
  children,
  tabletEditorial = false,
  editorialRail = false,
  eyebrowParticipates,
  headingParticipates = true,
  bodyParticipates = true,
  renderFlow,
  specializedClassName = "",
  containLongContent = false,
}: {
  number: string | null;
  eyebrow?: React.ReactNode;
  heading: React.ReactNode;
  children: React.ReactNode;
  tabletEditorial?: boolean;
  editorialRail?: boolean;
  eyebrowParticipates?: boolean;
  headingParticipates?: boolean;
  bodyParticipates?: boolean;
  renderFlow?: (specialized: React.ReactNode) => React.ReactNode;
  specializedClassName?: string;
  containLongContent?: boolean;
}) {
  const hasEyebrow = eyebrowParticipates ?? Boolean(eyebrow);
  return (
    <SectionContentInset
      className=""
      style={{ boxShadow: "var(--me-frame)" }}
    >
      {(() => { const specialized = <div data-section-specialized-content
        className={
          `mx-auto w-full max-w-5xl ${specializedClassName} ${containLongContent ? "min-w-0 max-w-full" : ""} ${!number && !editorialRail
            ? "block"
            : tabletEditorial
            ? "grid grid-cols-[3rem_minmax(0,1fr)] gap-5"
            : `grid gap-9 ${containLongContent ? "md:grid-cols-[5rem_minmax(0,1fr)]" : "md:grid-cols-[5rem_1fr]"}`}`
        }
      >
        {number && <p className="text-[10px] font-bold tracking-[0.25em]" aria-hidden="true">{number} / 10</p>}
        <div className={tabletEditorial || containLongContent ? "min-w-0 max-w-full" : ""}>
          {hasEyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--me-section-accent)]">{eyebrow}</p>}
          {headingParticipates && <h2
            data-section-heading
            className={`${containLongContent ? "w-full min-w-0 max-w-3xl [overflow-wrap:anywhere]" : "max-w-3xl"} font-[family-name:var(--me-heading-font)] text-4xl leading-none tracking-[-0.035em] sm:text-6xl ${hasEyebrow ? "mt-4" : ""}`}
          >
            {heading}
          </h2>}
          {bodyParticipates && <div
            data-section-body
            className={`${containLongContent ? "min-w-0 max-w-full [overflow-wrap:anywhere]" : ""} text-sm leading-7 text-[var(--me-muted)] ${hasEyebrow || headingParticipates ? "mt-12" : ""}`}
          >
            {children}
          </div>}
        </div>
      </div>; return renderFlow ? renderFlow(specialized) : specialized; })()}
    </SectionContentInset>
  );
}
