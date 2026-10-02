import { createContext, useContext, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import {
  ANIMATION_DELAY_MS,
  ANIMATION_DURATION_MS,
  ANIMATION_EASING,
  ANIMATION_INTERSECTION_ROOT_MARGIN,
  ANIMATION_INTERSECTION_THRESHOLD,
  hasEntranceAnimation,
  type AuthoredAnimation,
} from "./contract";

type MotionSession = { revealed: Set<string> };
type MotionRuntime = { enabled: boolean; session: MotionSession };

const MotionRuntimeContext = createContext<MotionRuntime | null>(null);
const AnimatedAncestorContext = createContext(false);

type ObserverRegistration = { reveal: () => void };
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
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const registration = registrations.get(entry.target);
      if (!registration) continue;
      registrations.delete(entry.target);
      observer.unobserve(entry.target);
      registration.reveal();
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

export function WebsiteMotionRuntime({ enabled, sessionKey, children }: { enabled: boolean; sessionKey: string | number; children: ReactNode }) {
  const session = useMemo(
    () => ({ key: sessionKey, revealed: new Set<string>() }),
    [sessionKey],
  );
  const runtime = useMemo<MotionRuntime>(() => ({ enabled, session }), [enabled, session]);
  return <MotionRuntimeContext.Provider value={runtime}>{children}</MotionRuntimeContext.Provider>;
}

export function WebsiteMotion({ ownerId, animation, children, className }: { ownerId: string; animation?: AuthoredAnimation; children: ReactNode; className?: string }) {
  const runtime = useContext(MotionRuntimeContext);
  const animatedAncestor = useContext(AnimatedAncestorContext);
  const ref = useRef<HTMLDivElement>(null);
  const effective = hasEntranceAnimation(animation);
  const active = Boolean(runtime?.enabled && effective && !animatedAncestor);
  const entrance = animation?.entrance;
  const signature = `${entrance?.type ?? "none"}:${entrance?.speed ?? "normal"}:${entrance?.delay ?? "none"}`;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!active || !runtime || runtime.session.revealed.has(ownerId)) {
      setFinalState(node);
      return;
    }
    const ownerWindow = node.ownerDocument.defaultView;
    const reducedMotion = ownerWindow?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    const registry = reducedMotion ? null : observerFor(node.ownerDocument);
    if (!registry || !entrance?.type || entrance.type === "none") {
      runtime.session.revealed.add(ownerId);
      setFinalState(node);
      return;
    }

    const initial = initialStyle(entrance.type);
    node.style.opacity = String(initial.opacity);
    node.style.transform = String(initial.transform);
    node.style.willChange = "opacity, transform";
    node.dataset.motionState = "pending";
    const reveal = () => {
      if (runtime.session.revealed.has(ownerId)) return;
      runtime.session.revealed.add(ownerId);
      registry.registrations.delete(node);
      registry.observer.unobserve(node);
      const duration = ANIMATION_DURATION_MS[entrance.speed ?? "normal"];
      const delay = ANIMATION_DELAY_MS[entrance.delay ?? "none"];
      node.style.transition = `opacity ${duration}ms ${ANIMATION_EASING} ${delay}ms, transform ${duration}ms ${ANIMATION_EASING} ${delay}ms`;
      node.dataset.motionState = "animating";
      const finishFrame = () => {
        node.style.opacity = "1";
        node.style.transform = "none";
      };
      if (ownerWindow?.requestAnimationFrame) ownerWindow.requestAnimationFrame(finishFrame);
      else finishFrame();
      const finish = () => {
        node.style.removeProperty("will-change");
        node.dataset.motionState = "revealed";
      };
      node.addEventListener("transitionend", finish, { once: true });
    };
    registry.registrations.set(node, { reveal });
    registry.observer.observe(node);
    const revealOnFocus = (event: FocusEvent) => {
      if (node.contains(event.target as Node)) reveal();
    };
    node.addEventListener("focusin", revealOnFocus);
    return () => {
      registry.registrations.delete(node);
      registry.observer.unobserve(node);
      node.removeEventListener("focusin", revealOnFocus);
    };
  }, [active, entrance?.delay, entrance?.speed, entrance?.type, ownerId, runtime, signature]);

  return <AnimatedAncestorContext.Provider value={animatedAncestor || active}>
    <div ref={ref} className={className} data-website-motion={ownerId} data-motion-effect={active ? entrance?.type : undefined}>
      {children}
    </div>
  </AnimatedAncestorContext.Provider>;
}
