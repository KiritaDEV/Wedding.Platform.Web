import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { ResolvedDesignContext, TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import { resolveWebsiteColor } from "../websiteColors/projectColors";
import type { TextDocument, TextElement } from "../websiteElements/types";
import { resolveTextResponsiveAppearance, textFontCapabilities } from "../websiteElements/text";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { fontStackForTemplate } from "../websiteTemplates/design/catalogs";
import { TextCanvasEditor } from "../websiteEditor/components/TextCanvasEditor";
import { resolveTextEffects } from "../websiteElements/textEffects";
import { elementFontSizes } from "./elementTypography";

const lineHeights = { tight: 1.2, normal: 1.5, relaxed: 1.75 } as const;
const letterSpacings = { tight: "-0.02em", normal: "0em", wide: "0.08em" } as const;

export type TextElementRendererProps = { element: TextElement; previewColor?: string; previewTextShadowColor?: string; previewGlowColor?: string; viewport: ResponsiveViewport; templateKey: string; library: TemplateDesignLibrary; projectColors?: readonly ProjectColor[]; context?: ResolvedDesignContext | null; editor?: { onDocumentChange: (elementId: string, document: TextDocument) => void; onAddColor: (value: string) => Promise<ProjectColor> } };

export function TextElementRenderer({ element, viewport, templateKey, library, projectColors = [], context, editor, previewColor, previewTextShadowColor, previewGlowColor }: TextElementRendererProps) {
  const appearance = element.appearance ?? {};
  const responsive = resolveTextResponsiveAppearance(appearance, viewport, { fontSize: "m", alignment: "start" });
  const fontFamilyId = appearance.fontFamilyId ?? context?.bodyFontId;
  const fontCapabilities = textFontCapabilities(fontFamilyId);
  const baseFontWeight = appearance.fontWeight ?? 400;
  const emphasizedFontWeight = fontCapabilities.weights.includes(700) ? 700 : baseFontWeight;
  const decorations = [appearance.underline && "underline", appearance.strikethrough && "line-through"].filter(Boolean).join(" ") || undefined;
  const textShadow = resolveTextEffects(appearance.textShadow, previewTextShadowColor ?? resolveWebsiteColor(appearance.textShadowColorId, library, projectColors), appearance.glow, previewGlowColor ?? resolveWebsiteColor(appearance.glowColorId, library, projectColors));
  const style: CSSProperties = { width: "100%", fontFamily: fontFamilyId ? fontStackForTemplate(templateKey, fontFamilyId) : "inherit", fontWeight: appearance.fontWeight ?? 400, fontSize: elementFontSizes[responsive.fontSize], lineHeight: lineHeights[appearance.lineHeight ?? "normal"], letterSpacing: letterSpacings[appearance.letterSpacing ?? "normal"], textAlign: responsive.alignment, color: previewColor ?? resolveWebsiteColor(appearance.colorId ?? context?.bodyColorId, library, projectColors) ?? "inherit", textShadow, fontStyle: appearance.italic ? "italic" : undefined, textDecorationLine: decorations, textTransform: appearance.textTransform === "none" ? undefined : appearance.textTransform };
  return <div data-website-element="text" className="m-0 min-h-0 w-full min-w-0 max-w-full p-0 [overflow-wrap:anywhere] [&>p+p]:mt-[1.5em] [&>p[data-text-empty-paragraph]]:!mt-0" style={style}>{editor ? <TextCanvasEditor element={element} viewport={viewport} effectiveFontFamilyId={fontFamilyId} library={library} projectColors={projectColors} onAddColor={editor.onAddColor} onDocumentChange={editor.onDocumentChange} /> : renderDocument(element.document, emphasizedFontWeight, fontCapabilities.italic, library, projectColors)}</div>;
}

function renderDocument(document: TextDocument, emphasizedFontWeight: number, supportsItalic: boolean, library: TemplateDesignLibrary, projectColors: readonly ProjectColor[]) {
  return document.children.map((block, index) => {
    const empty = block.children.every((run) => run.text.length === 0);
    return <p className="m-0 whitespace-pre-wrap" data-text-empty-paragraph={empty || undefined} key={index}>{empty ? null : renderRuns(block.children, emphasizedFontWeight, supportsItalic, library, projectColors)}</p>;
  });
}

function renderRuns(runs: TextDocument["children"][number]["children"], emphasizedFontWeight: number, supportsItalic: boolean, library: TemplateDesignLibrary, projectColors: readonly ProjectColor[]) {
  return runs.map((run, index) => {
    let content: ReactNode = run.text;
    if (run.marks?.bold) content = <strong style={{ fontWeight: emphasizedFontWeight }}>{content}</strong>;
    if (run.marks?.italic) content = <em style={supportsItalic ? undefined : { fontStyle: "normal" }}>{content}</em>;
    if (run.marks?.underline) content = <u>{content}</u>;
    if (run.marks?.strikethrough) content = <s>{content}</s>;
    const color = resolveWebsiteColor(run.colorId, library, projectColors);
    return color ? <span key={index} style={{ color }}>{content}</span> : <Fragment key={index}>{content}</Fragment>;
  });
}
