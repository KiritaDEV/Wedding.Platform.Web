import { EditableText } from "../../../websiteEditor/inline/EditableText";
import type { RsvpContent } from "../../../websiteEditor/types";
import { SectionContentInset } from "../../SectionContentInset";
import { PrivateRsvpRuntime } from "../../PrivateRsvpRuntime";

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
  sectionId,
  content,
}: {
  sectionId: string;
  content: RsvpContent["semantic"];
}) {
  return (
    <EditorialSection
      number="10"
      containLongContent
      heading={
        <EditableText
          sectionId={sectionId}
          path={["semantic", "heading"]}
          value={content.heading}
          fallback="Kindly Respond"
          placeholder="Add heading"
          label="RSVP heading"
        />
      }
    >
      <p className="w-full max-w-xl whitespace-pre-line text-lg [overflow-wrap:anywhere]">
        <EditableText
          sectionId={sectionId}
          path={["semantic", "description"]}
          value={content.description}
          fallback="We would be honored to celebrate this day with you."
          placeholder="Add description"
          label="RSVP description"
          multiline
        />
      </p>
      <PrivateRsvpRuntime buttonClassName="mt-10 inline-block max-w-full whitespace-normal border-2 border-[var(--me-theme-text)] px-8 py-4 text-xs font-bold uppercase tracking-[0.22em] [overflow-wrap:anywhere]">
        <EditableText
          sectionId={sectionId}
          path={["semantic", "buttonLabel"]}
          value={content.buttonLabel}
          fallback="RSVP"
          placeholder="Add button label"
          label="RSVP button label"
        />
      </PrivateRsvpRuntime>
    </EditorialSection>
  );
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
