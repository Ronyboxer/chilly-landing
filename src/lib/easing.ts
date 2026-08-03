/** The site's single easing curve, in the three forms different APIs want. */

/** CSS / inline-style form. */
export const EASE_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** Framer Motion form. */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Numeric form — for Lenis and for any progress we map by hand.
 * Clamped at 1 so Lenis always resolves exactly onto its target.
 */
export function expoOut(t: number): number {
  return Math.min(1, 1.001 - Math.pow(2, -10 * t));
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Normalise `v` to 0–1 across the window [from, to] and ease it.
 * Used to hang UI beats off scrub progress without a timeline.
 */
export function easedRange(v: number, from: number, to: number): number {
  return expoOut(clamp01((v - from) / (to - from)));
}

/** Durations, in seconds, for Framer Motion. */
export const DUR = {
  micro: 0.2,
  enter: 0.6,
  enterSlow: 0.8,
} as const;
