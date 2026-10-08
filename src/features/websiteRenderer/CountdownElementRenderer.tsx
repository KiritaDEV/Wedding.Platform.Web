import { useEffect, useState, type CSSProperties } from "react";
import type { ResolvedDesignContext, TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import { resolveWebsiteColor } from "../websiteColors/projectColors";
import { calculateCountdown, COUNTDOWN_DEFAULT_LABELS, COUNTDOWN_EDITOR_SAMPLE, countdownDelay, countdownIsZero, enabledCountdownUnits, type CountdownValue } from "../websiteElements/countdown";
import type { CountdownElement } from "../websiteElements/types";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { resolveRuntimeTextAppearance, resolveRuntimeTextResources } from "../websitePresentation/runtimeTextAppearance";
import { resolveTextEffects } from "../websiteElements/textEffects";
import { elementFontSizes } from "./elementTypography";
import { scopedColorPreviewTarget, useEditorColorPreview } from "../websiteEditor/colorPreview";
import { useEventTiming } from "./EventTimingContext";

const lineHeights = { tight: 1.2, normal: 1.5, relaxed: 1.75 } as const;
const letterSpacings = { tight: "-0.02em", normal: "0em", wide: "0.08em" } as const;
const gaps = { xs: "0.375rem", s: "0.75rem", m: "1rem", l: "1.5rem", xl: "2rem" } as const;

export function CountdownElementRenderer({ element, mode, sectionId, viewport, templateKey, library, projectColors = [], context }: { sectionId?: string; element: CountdownElement; mode: "editor" | "public"; viewport: ResponsiveViewport; templateKey: string; library: TemplateDesignLibrary; projectColors?: readonly ProjectColor[]; context?: ResolvedDesignContext | null }) {
  const numberColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId ?? "", `${element.id}:numbers:color`), mode === "editor");
  const labelColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId ?? "", `${element.id}:labels:color`), mode === "editor");
  const numberShadowColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId ?? "", `${element.id}:numbers:textShadowColor`), mode === "editor");
  const numberGlowColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId ?? "", `${element.id}:numbers:glowColor`), mode === "editor");
  const labelShadowColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId ?? "", `${element.id}:labels:textShadowColor`), mode === "editor");
  const labelGlowColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId ?? "", `${element.id}:labels:glowColor`), mode === "editor");
  const event = useEventTiming();
  const target = element.target.source === "custom" ? element.target.instant : event.startsAtUtc;
  const targetMs = target ? Date.parse(target) : Number.NaN;
  const units = enabledCountdownUnits(element);
  const unitSignature = units.join(",");
  const secondsVisible = units.includes("seconds");
  const [initialNow] = useState(() => Date.now());
  const [clock, setClock] = useState<{ targetMs: number; value: CountdownValue }>(() => ({ targetMs, value: calculateCountdown(targetMs, initialNow) }));
  useEffect(() => {
    if (mode === "editor" || !Number.isFinite(targetMs)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      const now = Date.now();
      const next = calculateCountdown(targetMs, now);
      setClock({ targetMs, value: next });
      if (!countdownIsZero(next)) timer = setTimeout(update, countdownDelay(now, secondsVisible));
    };
    timer = setTimeout(update, 0);
    return () => { if (timer) clearTimeout(timer); };
  }, [mode, targetMs, unitSignature, secondsVisible]);
  const value = mode === "editor" ? COUNTDOWN_EDITOR_SAMPLE : clock.targetMs === targetMs ? clock.value : calculateCountdown(targetMs, initialNow);
  if (!Number.isFinite(targetMs) && mode !== "editor") return null;
  if (!Number.isFinite(targetMs)) return <div data-website-element="countdown" role="status" className="rounded-md border border-dashed p-4 text-center text-sm">Set the Event date and start time, or choose a custom Countdown target.</div>;

  const device = viewport === "desktop" ? undefined : element.appearance?.responsive?.[viewport];
  const direction = device?.direction ?? element.appearance?.direction ?? "horizontal";
  const alignment = device?.alignment ?? element.appearance?.alignment ?? "center";
  const gap = device?.gap ?? element.appearance?.gap ?? "m";
  const numberStyle = roleStyle(resolveRuntimeTextAppearance({ fallback: { fontSize: "4xl", fontWeight: 700, alignment: "center" }, shared: element.appearance?.numbers, exactDevice: device?.numbers }, viewport), templateKey, library, projectColors, context, numberShadowColor, numberGlowColor);
  const labelStyle = roleStyle(resolveRuntimeTextAppearance({ fallback: { fontSize: "s", fontWeight: 400, alignment: "center", textTransform: "uppercase", letterSpacing: "wide" }, shared: element.appearance?.labels, exactDevice: device?.labels }, viewport), templateKey, library, projectColors, context, labelShadowColor, labelGlowColor);
  const phrase = units.map((unit) => `${value[unit]} ${element.labels?.[unit] || COUNTDOWN_DEFAULT_LABELS[unit].toLowerCase()}`).join(", ");
  return <div data-website-element="countdown" role="timer" aria-live="off" aria-label={phrase} className="flex w-full min-w-0 max-w-full" style={{ flexDirection: direction === "horizontal" ? "row" : "column", justifyContent: alignment === "start" ? "flex-start" : alignment === "end" ? "flex-end" : "center", alignItems: direction === "vertical" ? alignment === "start" ? "flex-start" : alignment === "end" ? "flex-end" : "center" : "stretch", gap: gaps[gap] }}>
    {units.map((unit) => <div key={unit} aria-hidden="true" className="flex min-w-0 flex-col items-center" style={{ minInlineSize: unit === "days" ? "4ch" : "3ch" }}><span style={{ ...numberStyle, color: numberColor ?? numberStyle.color, fontVariantNumeric: "tabular-nums" }}>{unit === "days" ? value[unit] : String(value[unit]).padStart(2, "0")}</span><span style={{ ...labelStyle, color: labelColor ?? labelStyle.color }}>{element.labels?.[unit] || COUNTDOWN_DEFAULT_LABELS[unit]}</span></div>)}
  </div>;
}

function roleStyle(appearance: ReturnType<typeof resolveRuntimeTextAppearance>, templateKey: string, library: TemplateDesignLibrary, projectColors: readonly ProjectColor[], context?: ResolvedDesignContext | null, previewShadowColor?: string, previewGlowColor?: string): CSSProperties {
  const resources = resolveRuntimeTextResources(appearance, { templateKey, library, projectColors, context });
  const decorations = [appearance.underline && "underline", appearance.strikethrough && "line-through"].filter(Boolean).join(" ") || undefined;
  return { fontFamily: resources.fontFamily, color: resources.color, fontSize: elementFontSizes[appearance.fontSize ?? "m"], fontWeight: appearance.fontWeight ?? 400, lineHeight: lineHeights[appearance.lineHeight ?? "normal"], letterSpacing: letterSpacings[appearance.letterSpacing ?? "normal"], textAlign: appearance.alignment ?? "center", fontStyle: appearance.italic && resources.supportsItalic ? "italic" : undefined, textDecorationLine: decorations, textTransform: appearance.textTransform === "none" ? undefined : appearance.textTransform, textShadow: resolveTextEffects(appearance.textShadow, previewShadowColor ?? resolveWebsiteColor(appearance.textShadowColorId, library, projectColors), appearance.glow, previewGlowColor ?? resolveWebsiteColor(appearance.glowColorId, library, projectColors)) };
}
