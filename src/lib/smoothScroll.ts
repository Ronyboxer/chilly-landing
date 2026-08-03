import type Lenis from 'lenis';
import { expoOut } from './easing';

/**
 * Module-level handle on the Lenis instance.
 *
 * Deliberately not React context: anchor navigation is a one-off imperative
 * action, and putting the instance in context would give every consumer a
 * re-render reason it doesn't need.
 */
let instance: Lenis | null = null;

export function registerLenis(next: Lenis | null) {
  instance = next;
}

export function getLenis(): Lenis | null {
  return instance;
}

/** Anchor navigation. Goes through Lenis so it shares the page's easing. */
export function scrollToTarget(target: string | HTMLElement, offset = 0) {
  const lenis = getLenis();

  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.4, easing: expoOut });
    return;
  }

  // Reduced motion (or Lenis not mounted): jump, don't animate.
  const element =
    typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!element) return;
  window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY + offset });
}

/** Used to hold the page still until the hero video is buffered. */
export function setScrollLocked(locked: boolean) {
  const lenis = getLenis();
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? 'hidden' : '';
}
