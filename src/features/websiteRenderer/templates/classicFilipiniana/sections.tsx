import { EditableText } from "../../../websiteEditor/inline/EditableText";
import type { GalleryContent, RsvpContent } from "../../../websiteEditor/types";
import { ClassicFoundationOrnament } from "./decorations";
import { SectionContentInset } from "../../SectionContentInset";

export function ClassicFilipinianaGallery({
  sectionId,
  content,
  mode,
}: {
  sectionId: string;
  content: GalleryContent["semantic"];
  mode: "editor" | "public";
}) {
  return (
    <ContentSection
      eyebrow="Memories"
      heading={
        <EditableText
          sectionId={sectionId}
          path={["semantic", "heading"]}
          value={content.heading}
          fallback="Gallery"
          placeholder="Add heading"
          label="Gallery heading"
        />
      }
    >
      {mode === "editor" && (
        <div
          className="mx-auto grid max-w-xl grid-cols-3 items-center gap-3"
          aria-label="Empty gallery preview"
        >
          <div className="aspect-[4/5] -rotate-2 border border-[var(--cf-border)] bg-[color-mix(in_srgb,var(--cf-surface)_65%,transparent)] shadow-sm" />
          <div className="flex aspect-[4/5] items-center justify-center border border-[var(--cf-border)] bg-[var(--cf-surface)] px-2 text-xs italic text-[var(--cf-muted)] shadow-sm">
            Photos will appear here
          </div>
          <div className="aspect-[4/5] rotate-2 border border-[var(--cf-border)] bg-[color-mix(in_srgb,var(--cf-surface)_65%,transparent)] shadow-sm" />
        </div>
      )}
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
      <p className="mx-auto max-w-lg whitespace-pre-line">
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
      <div
        data-rsvp-button
        className="mx-auto mt-9 max-w-xs border border-[var(--cf-theme-accent)] bg-[var(--cf-theme-accent)] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white"
      >
        <EditableText
          sectionId={sectionId}
          path={["semantic", "buttonLabel"]}
          value={content.buttonLabel}
          fallback="RSVP"
          placeholder="Add button label"
          label="RSVP button label"
        />
      </div>
    </ContentSection>
  );
}

function ContentSection({
  eyebrow,
  heading,
  children,
  eyebrowParticipates,
  headingParticipates = true,
  bodyParticipates = true,
  renderFlow,
  specializedClassName = "",
}: {
  eyebrow?: React.ReactNode;
  heading: React.ReactNode;
  children: React.ReactNode;
  eyebrowParticipates?: boolean;
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
            <ClassicFoundationOrnament className="mx-auto mb-5 h-5 w-32 opacity-75" />
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
