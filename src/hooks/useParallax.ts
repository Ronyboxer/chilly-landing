import { useEffect } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-linked vertical offset, on the shared ScrollTrigger pipeline.
 *
 * Deliberately not Framer Motion's `useScroll`/`useTransform`: those drive
 * MotionValues from Framer's own frame loop, which would mean a second rAF
 * running alongside the scrub. Every scroll-linked animation on this page goes
 * through the one GSAP ticker that Lenis already drives.
 *
 * @param distance Peak offset in px, applied symmetrically (+d entering, -d leaving).
 */
export function useParallax(
  ref: RefObject<HTMLElement | null>,
  distance = 48,
  enabled = true,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const setY = gsap.quickSetter(element, 'y', 'px') as (value: number) => void;

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => setY((0.5 - self.progress) * distance * 2),
    });

    return () => {
      trigger.kill();
      gsap.set(element, { clearProps: 'transform' });
    };
  }, [ref, distance, enabled]);
}
