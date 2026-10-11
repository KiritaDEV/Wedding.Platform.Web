import { createContext, useContext, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import {
  ANIMATION_DELAY_MS,
  ANIMATION_DURATION_MS,
  ANIMATION_EASING,
  ANIMATION_INTERSECTION_ROOT_MARGIN,
  ANIMATION_INTERSECTION_THRESHOLD,
  cappedGalleryStaggerDelay,
  hasEntranceAnimation,
  type AuthoredAnimation,
} from "./contract";

type MotionSession = { revealed: Set<string> };
export type EditMotionReplay = { ownerId: string; generation: number };
type MotionRuntime = { enabled: boolean; session: MotionSession; editReplay?: EditMotionReplay };

const MotionRuntimeContext = createContext<MotionRuntime | null>(null);
const AnimatedAncestorContext = createContext(false);

export type MotionBatch = { ownerId: string; order: number; staggerMs: number };
type ObserverRegistration = { reveal: (additionalDelayMs?: number) => void; batch?: MotionBatch };
type DocumentObserver = {
  observer: IntersectionObserver;
  registrations: Map<Element, ObserverRegistration>;
};

const observers = new WeakMap<Document, DocumentObserver>();

function observerFor(documentTarget: Document): DocumentObserver | null {
  const existing = observers.get(documentTarget);
  if (existing) return existing;
  const ViewIntersectionObserver = documentTarget.defaultView?.IntersectionObserver;
  if (!ViewIntersectionObserver) return null;
  const registrations = new Map<Element, ObserverRegistration>();
  const observer = new ViewIntersectionObserver((entries) => {
    const batches = new Map<string, Array<{ registration: ObserverRegistration; target: Element }>>();
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const registration = registrations.get(entry.target);
      if (!registration) continue;
      if (registration.batch) {
        const items = batches.get(registration.batch.ownerId) ?? [];
        items.push({ registration, target: entry.target });
        batches.set(registration.batch.ownerId, items);
      } else {
        registrations.delete(entry.target);
        observer.unobserve(entry.target);
        registration.reveal();
      }
    }
    for (const items of batches.values()) {
      items.sort((a, b) => (a.registration.batch?.order ?? 0) - (b.registration.batch?.order ?? 0));
      items.forEach(({ registration, target }, index) => {
        registrations.delete(target);
        observer.unobserve(target);
        registration.reveal(cappedGalleryStaggerDelay(index, registration.batch?.staggerMs ?? 0));
      });
    }
  }, { threshold: ANIMATION_INTERSECTION_THRESHOLD, rootMargin: ANIMATION_INTERSECTION_ROOT_MARGIN });
  const created = { observer, registrations };
  observers.set(documentTarget, created);
  return created;
}

function initialStyle(type: NonNullable<AuthoredAnimation["entrance"]>["type"]): CSSProperties {
  if (type === "fade-up") return { opacity: 0, transform: "translateY(24px)" };
  if (type === "fade-down") return { opacity: 0, transform: "translateY(-24px)" };
  if (type === "scale-in") return { opacity: 0, transform: "scale(.96)" };
  return { opacity: 0, transform: "none" };
}

function setFinalState(node: HTMLElement): void {
  node.style.opacity = "1";
  node.style.transform = "none";
  node.style.removeProperty("transition");
  node.style.removeProperty("will-change");
  node.dataset.motionState = "revealed";
}

function commitExplicitReplayInitialState(node: HTMLElement): void {
  node.style.removeProperty("transition");
  // A deliberate Edit Replay is the only path that forces layout. This commits
  // the initial hidden/transformed state before the transition starts.
  void node.getBoundingClientRect();
}

export function WebsiteMotionRuntime({ enabled, sessionKey, editReplay, children }: { enabled: boolean; sessionKey: string | number; editReplay?: EditMotionReplay; children: ReactNode }) {
  const session = useMemo(
    () => ({ key: sessionKey, revealed: new Set<string>() }),
    [sessionKey],
  );
  const runtime = useMemo<MotionRuntime>(() => ({ enabled, session, editReplay }), [editReplay, enabled, session]);
  return <MotionRuntimeContext.Provider value={runtime}>{children}</MotionRuntimeContext.Provider>;
}

export function WebsiteMotion({ ownerId, animation, children, className, batch, galleryItemId }: { ownerId: string; animation?: AuthoredAnimation; children: ReactNode; className?: string; batch?: MotionBatch; galleryItemId?: string }) {
  const runtime = useContext(MotionRuntimeContext);
  const animatedAncestor = useContext(AnimatedAncestorContext);
  const ref = useRef<HTMLDivElement>(null);
  const effective = hasEntranceAnimation(animation);
  const batchOwnerId = batch?.ownerId;
  const batchOrder = batch?.order;
  const batchStaggerMs = batch?.staggerMs;
  const replayActive = runtime?.editReplay?.ownerId === ownerId || Boolean(batchOwnerId && runtime?.editReplay?.ownerId === batchOwnerId);
  const active = Boolean((runtime?.enabled || replayActive) && effective && !animatedAncestor);
  const entrance = animation?.entrance;
  const signature = `${entrance?.type ?? "none"}:${entrance?.speed ?? "normal"}:${entrance?.delay ?? "none"}`;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reducedMotion = node.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (!active || !runtime || (!replayActive && runtime.session.revealed.has(ownerId))) {
      setFinalState(node);
      return;
    }
    const ownerWindow = node.ownerDocument.defaultView;
    if (reducedMotion || !entrance?.type || entrance.type === "none") {
      runtime.session.revealed.add(ownerId);
      setFinalState(node);
      return;
    }

    const initial = initialStyle(entrance.type);
    node.style.opacity = String(initial.opacity);
    node.style.transform = String(initial.transform);
    node.style.willChange = "opacity, transform";
    node.dataset.motionState = "pending";
    if (replayActive) commitExplicitReplayInitialState(node);
    const registry = replayActive ? null : observerFor(node.ownerDocument);
    let finishFrame: number | undefined;
    let completeTransition: (() => void) | undefined;
    const reveal = (additionalDelayMs = replayActive && batchOrder !== undefined ? cappedGalleryStaggerDelay(batchOrder, batchStaggerMs ?? 0) : 0) => {
      if (!replayActive && runtime.session.revealed.has(ownerId)) return;
      runtime.session.revealed.add(ownerId);
      registry?.registrations.delete(node);
      registry?.observer.unobserve(node);
      const duration = ANIMATION_DURATION_MS[entrance.speed ?? "normal"];
      const delay = ANIMATION_DELAY_MS[entrance.delay ?? "none"] + additionalDelayMs;
      const finish = () => {
        node.style.opacity = "1";
        node.style.transform = "none";
      };
      const start = () => {
        node.style.transition = `opacity ${duration}ms ${ANIMATION_EASING} ${delay}ms, transform ${duration}ms ${ANIMATION_EASING} ${delay}ms`;
        node.dataset.motionState = "animating";
        finish();
      };
      if (ownerWindow?.requestAnimationFrame) {
        if (replayActive) finishFrame = ownerWindow.requestAnimationFrame(start);
        else {
          node.style.transition = `opacity ${duration}ms ${ANIMATION_EASING} ${delay}ms, transform ${duration}ms ${ANIMATION_EASING} ${delay}ms`;
          node.dataset.motionState = "animating";
          finishFrame = ownerWindow.requestAnimationFrame(finish);
        }
      } else start();
      completeTransition = () => {
        node.style.removeProperty("will-change");
        node.dataset.motionState = "revealed";
      };
      node.addEventListener("transitionend", completeTransition, { once: true });
    };
    if (replayActive) {
      reveal();
      return () => {
        if (finishFrame !== undefined) ownerWindow?.cancelAnimationFrame?.(finishFrame);
        if (completeTransition) node.removeEventListener("transitionend", completeTransition);
        setFinalState(node);
      };
    }
    if (!registry) {
      runtime.session.revealed.add(ownerId);
      setFinalState(node);
      return;
    }
    registry.registrations.set(node, { reveal, batch: batchOwnerId !== undefined && batchOrder !== undefined ? { ownerId: batchOwnerId, order: batchOrder, staggerMs: batchStaggerMs ?? 0 } : undefined });
    registry.observer.observe(node);
    const revealOnFocus = (event: FocusEvent) => {
      if (node.contains(event.target as Node)) reveal();
    };
    node.addEventListener("focusin", revealOnFocus);
    return () => {
      registry.registrations.delete(node);
      registry.observer.unobserve(node);
      node.removeEventListener("focusin", revealOnFocus);
      if (finishFrame !== undefined) ownerWindow?.cancelAnimationFrame?.(finishFrame);
      if (completeTransition) node.removeEventListener("transitionend", completeTransition);
    };
  }, [active, animatedAncestor, batchOrder, batchOwnerId, batchStaggerMs, entrance?.delay, entrance?.speed, entrance?.type, ownerId, replayActive, runtime, signature]);

  return <AnimatedAncestorContext.Provider value={animatedAncestor || active}>
    <div ref={ref} className={className} data-website-motion={ownerId} data-motion-effect={active ? entrance?.type : undefined} data-gallery-item={galleryItemId}>
      {children}
    </div>
  </AnimatedAncestorContext.Provider>;
}
