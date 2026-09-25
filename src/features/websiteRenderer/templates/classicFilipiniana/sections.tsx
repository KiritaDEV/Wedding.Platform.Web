import type { RsvpContent } from "../../../websiteEditor/types";
import { EditableText } from "../../../websiteEditor/inline/EditableText";
import { ClassicFoundationOrnament } from "./decorations";
import { SectionContentInset } from "../../SectionContentInset";
import { PrivateRsvpRuntime } from "../../PrivateRsvpRuntime";

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
  sectionId,
  content,
}: {
  sectionId: string;
  content: RsvpContent["semantic"];
}) {
  return (
    <ContentSection
      eyebrow="Celebrate with us"
      specializedClassName="min-w-0 max-w-full [overflow-wrap:anywhere]"
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
      <p className="mx-auto w-full max-w-lg whitespace-pre-line [overflow-wrap:anywhere]">
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
      <PrivateRsvpRuntime buttonClassName="mx-auto w-full max-w-xs whitespace-normal border border-[var(--cf-theme-accent)] bg-[var(--cf-theme-accent)] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white [overflow-wrap:anywhere]">
        <EditableText
          sectionId={sectionId}
          path={["semantic", "buttonLabel"]}
          value={content.buttonLabel}
          fallback="RSVP"
          placeholder="Add button label"
          label="RSVP button label"
        />
      </PrivateRsvpRuntime>
    </ContentSection>
  );
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
