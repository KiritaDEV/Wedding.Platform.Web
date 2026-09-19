import type {
  GalleryContent,
  ResolvedWebsiteMedia,
  ResponsiveViewport,
  RsvpContent,
  WebsiteSection,
  WebsiteSectionAppearance,
} from "../../websiteEditor/types";
import type { WebsiteRendererProps } from "../types";
import {
  ClassicFilipinianaGallery,
  ClassicFilipinianaRsvp,
} from "./classicFilipiniana/sections";
import { resolveClassicFilipinianaSectionAppearance } from "./classicFilipiniana/appearance";
import { resolveClassicFilipinianaDesign } from "./classicFilipiniana/design";
import {
  ClassicSectionDivider,
} from "./classicFilipiniana/decorations";
import { resolveSectionDesignTokens } from "../../websiteTemplates/design/catalogs";
import { SectionSurfaceDecoration } from "../SectionSurfaceDecoration";
import { BlankSectionRenderer } from "../BlankSectionRenderer";
import { isBlankSectionRenderable, isGallerySectionRenderable, isHeroSectionRenderable } from "../blankSectionRenderability";
import { HeroSectionRenderer } from "../HeroSectionRenderer";
import { resolveSectionComposition } from "../../websiteEditor/sectionComposition";
import { SectionChildFlowRenderer } from "../SectionChildFlowRenderer";
import { GalleryCollectionRenderer } from "../GalleryCollectionRenderer";
import { resolveOwnedSectionAppearance } from "../../websiteEditor/sectionAppearance";

export function ClassicFilipinianaRenderer({
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
    if (mode === "public" && section.type === "gallery") return isGallerySectionRenderable(section, website.templateKey, website.media, event.eventDate, targetViewport);
    if (mode === "public" && section.type === "hero") return isHeroSectionRenderable(section, website.templateKey, website.media, event.eventDate, targetViewport);
    return true;
  });

  return (
    <article
      className="min-h-full bg-[var(--cf-page)] font-[family-name:var(--cf-body-font)] text-[var(--cf-text)]"
      style={resolveClassicFilipinianaDesign(website.designSettings)}
    >
      {mode === "editor" && sections.length === 0 && (
        <div className="flex min-h-96 items-center justify-center px-8 text-center text-sm italic text-[var(--cf-muted)]">
          {scope.kind === "single-section"
            ? "Select a section to edit."
            : "Enabled sections will appear here."}
        </div>
      )}
      {sections.map(({ section }, renderedIndex) => (
        <ClassicSection
          key={section.id}
          section={section}
          showLeadingDivider={scope.kind === "full" && renderedIndex > 0}
          eventDate={event.eventDate}
          mode={mode}
          media={website.media}
          targetViewport={targetViewport}
          library={website.template!.capabilities.designLibrary}
          designSettings={website.designSettings}
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
function ClassicSection({
  section,
  showLeadingDivider,
  eventDate,
  mode,
  media,
  targetViewport,
  library,
  designSettings,
  templateKey,
  selected,
  onSelect,
  selectedElementId,
  onElementSelect,
  onElementEdit,
}: {
  section: WebsiteSection;
  showLeadingDivider: boolean;
  eventDate: string | null;
  mode: "editor" | "public";
  media: Record<string, ResolvedWebsiteMedia>;
  targetViewport: ResponsiveViewport;
  library: NonNullable<
    WebsiteRendererProps["website"]["template"]
  >["capabilities"]["designLibrary"];
  designSettings: WebsiteRendererProps["website"]["designSettings"];
  templateKey: string;
  selected: boolean;
  onSelect?: (sectionId: string) => void;
  selectedElementId?: string | null;
  onElementSelect?: (sectionId: string, elementId: string) => void;
  onElementEdit?: (sectionId: string, elementId: string) => void;
}) {
  const appearance = resolveClassicFilipinianaSectionAppearance(
    section.type,
    designSettings,
    section.appearance as unknown as WebsiteSectionAppearance,
    library,
    designSettings.customColors,
  );
  const design = resolveSectionDesignTokens(
    templateKey,
    library,
    section.resolvedDesignContext,
  );
  return (
    <section
      className={`${appearance.sectionClass} relative isolate cursor-default font-[family-name:var(--cf-body-font)] transition-shadow ${selected ? "z-10" : ""}`}
      style={
        {
          ...appearance.sectionStyle,
          ...(design
            ? {
                "--cf-heading-font": design.headingFont,
                "--cf-body-font": design.bodyFont,
                "--cf-text": design.headingColor,
                "--cf-muted": design.bodyColor,
                "--cf-section-body": design.bodyColor,
                "--cf-section-accent": design.accentColor,
              }
            : {}),
        } as React.CSSProperties
      }
      data-preview-section={section.id}
      data-section-surface
      onClick={mode === "editor" ? () => onSelect?.(section.id) : undefined}
      onKeyDown={
        mode === "editor"
          ? (event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
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
      {section.type === "hero" ? <>{showLeadingDivider && <ClassicSectionDivider />}<Section
        section={section}
        eventDate={eventDate}
        mode={mode}
        media={media}
        targetViewport={targetViewport}
        library={library}
        projectColors={designSettings.customColors}
        selectedElementId={selectedElementId}
        onElementSelect={onElementSelect}
        onElementEdit={onElementEdit}
      /></> : <SectionSurfaceDecoration templateKey={templateKey} appearance={(section.appearance as unknown as WebsiteSectionAppearance).decorativeAppearance} viewport={targetViewport} library={library} projectColors={designSettings.customColors} sectionId={section.id} mode={mode}>{showLeadingDivider && <ClassicSectionDivider />}<Section section={section} eventDate={eventDate} mode={mode} media={media} targetViewport={targetViewport} library={library} projectColors={designSettings.customColors} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} /></SectionSurfaceDecoration>}
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
      return <BlankSectionRenderer section={section} composition={resolved.composition} mode={mode} viewport={targetViewport} templateKey="classic-filipiniana-v1" library={library} projectColors={projectColors} media={media} eventDate={eventDate} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} />;
    }
    case "hero": {
      const resolved = resolveSectionComposition(section, targetViewport);
      return <HeroSectionRenderer section={section} composition={resolved.composition} mode={mode} viewport={targetViewport} templateKey="classic-filipiniana-v1" library={library} projectColors={projectColors} media={media} eventDate={eventDate} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} />;
    }
    case "gallery": {
      const resolved = resolveSectionComposition(section, targetViewport);
      return <SectionChildFlowRenderer sectionId={section.id} flow={resolved.composition.childFlow} specialized={<ClassicFilipinianaGallery
          sectionId={section.id}
          collection={<GalleryCollectionRenderer sectionId={section.id} items={(section.content as GalleryContent).semantic.items} media={media} appearance={resolveOwnedSectionAppearance(section.appearance, targetViewport)} viewport={targetViewport} mode={mode} />}
        />} mode={mode} viewport={targetViewport} templateKey="classic-filipiniana-v1" library={library} projectColors={projectColors} media={media} eventDate={eventDate} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} />;
    }
    case "rsvp":
      return (
        <ClassicFilipinianaRsvp
          sectionId={section.id}
          content={(section.content as RsvpContent).semantic}
        />
      );
    default:
      return mode === "editor" ? (
        <div className="px-6 py-10 text-center text-sm text-[var(--cf-muted)]">
          This section is not supported by this Template renderer.
        </div>
      ) : null;
  }
}
