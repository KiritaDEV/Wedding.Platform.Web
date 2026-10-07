import { useEffect, useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { ANIMATION_EFFECT_OPTIONS, ANIMATION_SPEED_OPTIONS, DEFAULT_ANIMATION_SPEED } from "../../websiteAnimation/authoring";
import { normalizeGalleryItemAnimation, type AnimationSpeed, type AnimationType, type GalleryAnimationStagger, type GalleryItemAnimation } from "../../websiteAnimation/contract";
import { InspectorDisclosure, InspectorField, InspectorResetAction } from "./InspectorPrimitives";

const STAGGER_OPTIONS = ["none", "short", "medium", "long"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }));

export function GalleryItemAnimationControls({ authored, effective, exactDevice, conflict, replayed, onChange, onReset, onReplay }: {
  authored?: GalleryItemAnimation; effective?: GalleryItemAnimation; exactDevice: boolean; conflict?: string; replayed?: boolean;
  onChange: (value: GalleryItemAnimation | undefined) => void; onReset?: () => void; onReplay: () => void;
}) {
  const helperId = useId();
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const sync = () => setReducedMotion(query.matches);
    sync(); query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);
  const resolved = authored ?? effective;
  const entrance = resolved?.entrance;
  const type = entrance?.type ?? "none";
  const speed = entrance?.speed ?? DEFAULT_ANIMATION_SPEED;
  const stagger = entrance?.stagger ?? "none";
  const summary = type === "none" ? "None" : `${ANIMATION_EFFECT_OPTIONS.find(option => option.value === type)?.label ?? type} · ${speed[0].toUpperCase() + speed.slice(1)} · ${stagger[0].toUpperCase() + stagger.slice(1)} stagger`;
  const set = (change: { type?: AnimationType; speed?: AnimationSpeed; stagger?: GalleryAnimationStagger }) => {
    const next = { entrance: { ...entrance, ...change } } as GalleryItemAnimation;
    onChange(normalizeGalleryItemAnimation(next, { preserveExplicitNone: exactDevice }));
  };
  const disabled = type === "none" || reducedMotion || Boolean(conflict);
  return <InspectorDisclosure title="Gallery item animation" summary={`${summary}${authored ? exactDevice ? " · Device override" : " · Authored" : type !== "none" ? " · Inherited" : ""}`} actions={exactDevice && authored && onReset ? <InspectorResetAction label="Use inherited" onClick={onReset} /> : undefined}>
    <InspectorField label="Effect" status={exactDevice ? authored ? type === "none" ? "Disabled on this device" : "Device override" : "Inherited" : undefined}><Select aria-label="Gallery item animation effect" value={type} options={ANIMATION_EFFECT_OPTIONS} onChange={value => set({ type: value as AnimationType })} /></InspectorField>
    {type !== "none" && <><InspectorField label="Speed"><Select aria-label="Gallery item animation speed" value={speed} options={ANIMATION_SPEED_OPTIONS} onChange={value => set({ speed: value as AnimationSpeed })} /></InspectorField><InspectorField label="Stagger"><Select aria-label="Gallery item animation stagger" value={stagger} options={STAGGER_OPTIONS} onChange={value => set({ stagger: value as GalleryAnimationStagger })} /></InspectorField></>}
    <Button type="button" size="sm" variant="secondary" disabled={disabled} aria-describedby={(conflict || reducedMotion) ? helperId : undefined} onClick={onReplay}>{replayed ? "Replay gallery items" : "Play gallery items"}</Button>
    {(conflict || reducedMotion) && <p id={helperId} className="text-xs text-foreground-muted" role="status">{reducedMotion ? "Gallery item replay is disabled because Reduce Motion is enabled on this device." : conflict}</p>}
  </InspectorDisclosure>;
}
