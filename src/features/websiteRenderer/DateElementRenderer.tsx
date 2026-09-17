import type { CSSProperties } from "react";
import type {
  ResolvedDesignContext,
  TemplateDesignLibrary,
} from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import { resolveWebsiteColor } from "../websiteColors/projectColors";
import type { DateElement } from "../websiteElements/types";
import { resolveTextResponsiveAppearance } from "../websiteElements/text";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { fontStackForTemplate } from "../websiteTemplates/design/catalogs";
import { formatDateOnly } from "./formatDateOnly";
import { elementFontSizes, elementLetterSpacings, elementLineHeights } from "./elementTypography";
import { resolveTextEffects } from "../websiteElements/textEffects";

export function DateElementRenderer({
  element,
  eventDate,
  mode,
  templateKey,
  library,
  projectColors = [],
  context,
  viewport,
  previewColor,
  previewTextShadowColor,
  previewGlowColor,
}: {
  element: DateElement;
  eventDate: string | null;
  mode: "editor" | "public";
  templateKey: string;
  library: TemplateDesignLibrary;
  projectColors?: readonly ProjectColor[];
  context?: ResolvedDesignContext | null;
  viewport: ResponsiveViewport;
  previewColor?: string;
  previewTextShadowColor?: string;
  previewGlowColor?: string;
}) {
  const appearance = element.appearance ?? {};
  const label = formatDateOnly(eventDate, appearance);
  if (!label) {
    return mode === "editor" ? (
      <p
        className="m-0 w-full text-sm italic text-foreground-muted"
        data-date-block-missing
        role="status"
      >
        Add a wedding date in Event settings to display this block.
      </p>
    ) : null;
  }

  const responsive = resolveTextResponsiveAppearance(appearance, viewport, { fontSize: "l", alignment: "start" });
  const authoredAlignment = viewport === "desktop" ? appearance.alignment : appearance.responsive?.[viewport]?.alignment ?? appearance.alignment;
  const fontFamilyId = appearance.fontFamilyId ?? context?.headingFontId;
  const style: CSSProperties = {
    display: "block",
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    margin: 0,
    padding: 0,
    overflowWrap: "anywhere",
    fontFamily: fontFamilyId ? fontStackForTemplate(templateKey, fontFamilyId) : "inherit",
    fontSize: elementFontSizes[responsive.fontSize],
    fontWeight: appearance.fontWeight ?? 600,
    lineHeight: elementLineHeights[appearance.lineHeight ?? "tight"],
    letterSpacing: elementLetterSpacings[appearance.letterSpacing ?? "normal"],
    textTransform: appearance.textTransform ?? "none",
    textAlign: authoredAlignment,
    color:
      (mode === "editor" ? previewColor : undefined) ??
      resolveWebsiteColor(appearance.colorId ?? context?.headingColorId, library, projectColors) ??
      "inherit",
    textShadow: resolveTextEffects(appearance.textShadow, previewTextShadowColor ?? resolveWebsiteColor(appearance.textShadowColorId, library, projectColors), appearance.glow, previewGlowColor ?? resolveWebsiteColor(appearance.glowColorId, library, projectColors)),
  };

  return (
    <time data-website-element="date" dateTime={eventDate!} style={style}>
      {label}
    </time>
  );
}
