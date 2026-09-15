import type {
  GalleryContent,
  ResolvedWebsiteMedia,
  ResponsiveViewport,
  RsvpContent,
  WebsiteSection,
  WebsiteSectionAppearance,
} from "../../websiteEditor/types";
import type { WebsiteRendererProps } from "../types";
import { resolveModernEditorialSectionAppearance } from "./modernEditorial/appearance";
import { resolveModernEditorialDesign } from "./modernEditorial/design";
import {
  ModernEditorialGallery,
  ModernEditorialRsvp,
} from "./modernEditorial/sections";
import { resolveSectionDesignTokens } from "../../websiteTemplates/design/catalogs";
import { SectionSurfaceDecoration } from "../SectionSurfaceDecoration";
import { BlankSectionRenderer } from "../BlankSectionRenderer";
import { isBlankSectionRenderable, isHeroSectionRenderable } from "../blankSectionRenderability";
import { HeroSectionRenderer } from "../HeroSectionRenderer";
import { resolveSectionComposition } from "../../websiteEditor/sectionComposition";

export function ModernEditorialRenderer({
  event,
  website,
  mode = "public",
  selectedSectionId,
  onSectionSelect,
  targetViewport = "desktop",
  scope = { kind: "full" },
  selectedElementId,
  onElementSelect,
  onElementEdit,
}: WebsiteRendererProps) {
  const candidates =
    scope.kind === "single-section"
      ? website.sections
          .map((section, index) => ({ section, index }))
          .filter(({ section }) => section.id === scope.sectionId)
      : website.sections
          .map((section, index) => ({ section, index }))
          .filter(({ section }) => section.isEnabled);
  const sections = candidates.filter(({ section }) => {
    if (mode === "public" && section.type === "blank") return isBlankSectionRenderable(section, website.templateKey, website.media, event.eventDate, targetViewport);
    if (mode === "public" && section.type === "hero") return isHeroSectionRenderable(section, website.templateKey, website.media, event.eventDate, targetViewport);
    return true;
  });
  return (
    <article
      className="min-h-full bg-[var(--me-page)] font-[family-name:var(--me-body-font)] text-[var(--me-text)]"
      style={resolveModernEditorialDesign(website.designSettings)}
    >
      {mode === "editor" && sections.length === 0 && (
        <div className="flex min-h-96 items-center justify-center px-8 text-center text-sm text-[var(--me-muted)]">
          {scope.kind === "single-section"
            ? "Select a section to edit."
            : "Enabled sections will appear here."}
        </div>
      )}
      {sections.map(({ section }) => (
        <ModernSection
          key={section.id}
          section={section}
          eventDate={event.eventDate}
          mode={mode}
          media={website.media}
          targetViewport={targetViewport}
          library={website.template!.capabilities.designLibrary}
          projectColors={website.designSettings.customColors}
          templateKey={website.templateKey}
          selected={mode === "editor" && selectedSectionId === section.id}
          onSelect={onSectionSelect}
          selectedElementId={selectedElementId}
          onElementSelect={onElementSelect}
          onElementEdit={onElementEdit}
        />
      ))}
    </article>
  );
}
function ModernSection({
  section,
  eventDate,
  mode,
  media,
  targetViewport,
  library,
  projectColors,
  templateKey,
  selected,
  onSelect,
  selectedElementId,
  onElementSelect,
  onElementEdit,
}: {
  section: WebsiteSection;
  eventDate: string | null;
  mode: "editor" | "public";
  media: Record<string, ResolvedWebsiteMedia>;
  targetViewport: ResponsiveViewport;
  library: NonNullable<
    WebsiteRendererProps["website"]["template"]
  >["capabilities"]["designLibrary"];
  projectColors: WebsiteRendererProps["website"]["designSettings"]["customColors"];
  templateKey: string;
  selected: boolean;
  onSelect?: (sectionId: string) => void;
  selectedElementId?: string | null;
  onElementSelect?: (sectionId: string, elementId: string) => void;
  onElementEdit?: (sectionId: string, elementId: string) => void;
}) {
  const appearance = resolveModernEditorialSectionAppearance(
    section.type,
    section.appearance as unknown as WebsiteSectionAppearance,
    library,
    projectColors,
  );
  const design = resolveSectionDesignTokens(
    templateKey,
    library,
    section.resolvedDesignContext,
  );
  return (
    <section
      className={`${appearance.sectionClass} relative isolate cursor-default border-b border-[var(--me-border)] font-[family-name:var(--me-body-font)] transition-shadow ${selected ? "z-10" : ""}`}
      style={
        {
          ...appearance.sectionStyle,
          ...(design
            ? {
                "--me-heading-font": design.headingFont,
                "--me-body-font": design.bodyFont,
                "--me-text": design.headingColor,
                "--me-muted": design.bodyColor,
                "--me-section-body": design.bodyColor,
                "--me-section-accent": design.accentColor,
              }
            : {}),
        } as React.CSSProperties
      }
      data-preview-section={section.id}
      data-section-surface
      onClick={mode === "editor" ? () => onSelect?.(section.id) : undefined}
      onKeyDown={
        mode === "editor"
          ? (keyboardEvent) => {
              if (keyboardEvent.target !== keyboardEvent.currentTarget) return;
              if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                keyboardEvent.preventDefault();
                onSelect?.(section.id);
              }
            }
          : undefined
      }
      role={mode === "editor" ? "group" : undefined}
      aria-label={
        mode === "editor" ? `${section.editorName ?? section.displayName} section` : undefined
      }
      tabIndex={mode === "editor" ? 0 : undefined}
    >
      {section.type === "hero" ? <Section
        section={section}
        eventDate={eventDate}
        mode={mode}
        media={media}
        targetViewport={targetViewport}
        library={library}
        projectColors={projectColors}
        selectedElementId={selectedElementId}
        onElementSelect={onElementSelect}
        onElementEdit={onElementEdit}
      /> : <SectionSurfaceDecoration templateKey={templateKey} appearance={(section.appearance as unknown as WebsiteSectionAppearance).decorativeAppearance} viewport={targetViewport} library={library} projectColors={projectColors} sectionId={section.id} mode={mode}><Section section={section} eventDate={eventDate} mode={mode} media={media} targetViewport={targetViewport} library={library} projectColors={projectColors} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} /></SectionSurfaceDecoration>}
    </section>
  );
}

function Section({
  section,
  eventDate,
  mode,
  media,
  targetViewport,
  library,
  projectColors,
  selectedElementId,
  onElementSelect,
  onElementEdit,
}: {
  section: WebsiteSection;
  eventDate: string | null;
  mode: "editor" | "public";
  media: Record<string, ResolvedWebsiteMedia>;
  targetViewport: ResponsiveViewport;
  library: NonNullable<
    WebsiteRendererProps["website"]["template"]
  >["capabilities"]["designLibrary"];
  projectColors: WebsiteRendererProps["website"]["designSettings"]["customColors"];
  selectedElementId?: string | null;
  onElementSelect?: (sectionId: string, elementId: string) => void;
  onElementEdit?: (sectionId: string, elementId: string) => void;
}) {
  switch (section.type) {
    case "blank": {
      const resolved = resolveSectionComposition(section, targetViewport);
      return <BlankSectionRenderer section={section} composition={resolved.composition} mode={mode} viewport={targetViewport} templateKey="modern-editorial-v1" library={library} projectColors={projectColors} media={media} eventDate={eventDate} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} />;
    }
    case "hero": {
      const resolved = resolveSectionComposition(section, targetViewport);
      return <HeroSectionRenderer section={section} composition={resolved.composition} mode={mode} viewport={targetViewport} templateKey="modern-editorial-v1" library={library} projectColors={projectColors} media={media} eventDate={eventDate} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} />;
    }
    case "gallery":
      return (
        <ModernEditorialGallery
          sectionId={section.id}
          content={(section.content as GalleryContent).semantic}
          mode={mode}
        />
      );
    case "rsvp":
      return (
        <ModernEditorialRsvp
          sectionId={section.id}
          content={(section.content as RsvpContent).semantic}
        />
      );
    default:
      return mode === "editor" ? (
        <div className="px-6 py-10 text-center text-sm text-[var(--me-muted)]">
          This section is not supported by this Template renderer.
        </div>
      ) : null;
  }
}
