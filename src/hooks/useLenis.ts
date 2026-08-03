import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { expoOut } from '../lib/easing';
import { registerLenis } from '../lib/smoothScroll';

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scroll, driven from GSAP's ticker.
 *
 * The sync is the whole point: Lenis emits `scroll`, which pushes
 * ScrollTrigger.update, and Lenis' own rAF is stepped by gsap.ticker. That
 * gives one rAF loop for the entire page — smoothing, scrub and video seek
 * all resolve inside a single frame, in order, with nothing racing.
 *
 * `lagSmoothing(0)` stops GSAP from silently swallowing long frames, which
 * would otherwise let the video seek head drift away from the scroll position
 * after a GC pause.
 */
export function useLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: expoOut,
      smoothWheel: true,
      // Touch is synced through Lenis too, so the scrub reads the same
      // smoothed position on mobile as it does on a trackpad. Without this the
      // sequence advances in native-momentum steps on touch.
      syncTouch: true,
      touchMultiplier: 1.5,
    });

    registerLenis(lenis);

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      registerLenis(null);
    };
  }, [enabled]);
}
