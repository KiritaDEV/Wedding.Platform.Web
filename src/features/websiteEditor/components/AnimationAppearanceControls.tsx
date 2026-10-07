import { useEffect, useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import {
  type AnimationDelay,
  type AnimationSpeed,
  type AnimationType,
  type AuthoredAnimation,
} from "../../websiteAnimation/contract";
import {
  animationSummary,
  ANIMATION_DELAY_OPTIONS,
  ANIMATION_EFFECT_OPTIONS,
  ANIMATION_SPEED_OPTIONS,
  DEFAULT_ANIMATION_DELAY,
  DEFAULT_ANIMATION_SPEED,
  updateAuthoredAnimation,
} from "../../websiteAnimation/authoring";
import { InspectorDisclosure, InspectorField, InspectorResetAction } from "./InspectorPrimitives";

export function AnimationAppearanceControls({ authored, effective, exactDevice = false, conflict, ownerLabel, replayed = false, onChange, onReset, onReplay }: {
  authored?: AuthoredAnimation;
  effective?: AuthoredAnimation;
  exactDevice?: boolean;
  conflict?: string;
  ownerLabel: string;
  replayed?: boolean;
  onChange: (animation: AuthoredAnimation | undefined) => void;
  onReset?: () => void;
  onReplay?: () => void;
}) {
  const helperId = useId();
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);
  const resolved = authored ?? effective;
  const type = resolved?.entrance?.type ?? "none";
  const disabledReplay = type === "none" || reducedMotion || Boolean(conflict) || !onReplay;
  const set = (change: { type?: AnimationType; speed?: AnimationSpeed; delay?: AnimationDelay }) =>
    onChange(updateAuthoredAnimation(authored ?? effective, change, exactDevice));
  return <InspectorDisclosure
    title="Animation"
    summary={`${animationSummary(resolved)}${authored ? exactDevice ? " · Device override" : " · Authored" : effective?.entrance?.type && effective.entrance.type !== "none" ? " · Inherited" : ""}`}
    actions={exactDevice && authored && onReset ? <InspectorResetAction label="Use inherited" onClick={onReset} /> : undefined}
  >
    <InspectorField label="Effect" status={exactDevice ? authored ? type === "none" ? "Disabled on this device" : "Device override" : "Inherited" : undefined}>
      <Select aria-label={`${ownerLabel} animation effect`} value={type} options={ANIMATION_EFFECT_OPTIONS} onChange={value => set({ type: value as AnimationType })} />
    </InspectorField>
    {type !== "none" && <>
      <InspectorField label="Speed"><Select aria-label={`${ownerLabel} animation speed`} value={resolved?.entrance?.speed ?? DEFAULT_ANIMATION_SPEED} options={ANIMATION_SPEED_OPTIONS} onChange={value => set({ speed: value as AnimationSpeed })} /></InspectorField>
      <InspectorField label="Delay"><Select aria-label={`${ownerLabel} animation delay`} value={resolved?.entrance?.delay ?? DEFAULT_ANIMATION_DELAY} options={ANIMATION_DELAY_OPTIONS} onChange={value => set({ delay: value as AnimationDelay })} /></InspectorField>
    </>}
    <Button type="button" size="sm" variant="secondary" disabled={disabledReplay} aria-describedby={(conflict || reducedMotion) ? helperId : undefined} onClick={onReplay}>{replayed ? "Replay animation" : "Play animation"}</Button>
    {(conflict || reducedMotion) && <p id={helperId} className="text-xs text-foreground-muted" role="status">{reducedMotion ? "Animation preview is disabled because Reduce Motion is enabled on this device." : conflict}</p>}
  </InspectorDisclosure>;
}
