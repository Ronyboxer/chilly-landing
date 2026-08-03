import { useEffect } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Mobile browsers fire resize every time the URL bar collapses. Re-measuring
// mid-scrub would visibly jolt the pin.
ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * Frame rate of the hero encode. Must match scripts/encode-hero.sh — it sets
 * both the pin length and the seek threshold, so a mismatch either wastes
 * scroll distance or lets redundant seeks through.
 *
 * The master is 24fps; the shipped encode is motion-interpolated to 48 so a
 * slow scrub still has a new frame to land on. Frame count is what buys
 * smoothness at long pin lengths — px-per-frame alone can only trade one
 * against the other.
 */
export const HERO_FPS = 48;

/** One frame, in seconds. Seeks finer than this cannot change what's on screen. */
const FRAME = 1 / HERO_FPS;

/**
 * Scroll distance per frame of video.
 *
 * Scroll length is derived from the frame count rather than a flat pixel
 * budget, so the sequence advances at a constant frames-per-pixel rate no
 * matter how long the clip is. At 11px/frame an 8s 48fps clip pins for
 * ~4200px: slower overall than the 24fps cut it replaces, while changing the
 * image every 11px of scroll instead of every 16.
 *
 * This is the one dial for scrub pace. Raise it to slow the sequence down,
 * lower it to speed up — but past roughly 16 the 48fps quantisation starts to
 * show as stepping on a slow scroll, and the fix for that is more frames in
 * the encode, not more pixels here.
 */
const PIXELS_PER_FRAME = 11;

/** Per-frame catch-up toward the target, normalised to 60Hz. */
const LERP = 0.12;

/** Keep clear of the very last frame; some decoders stall at exact duration. */
const TAIL_GUARD = FRAME;

interface UseScrollVideoOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** The element to pin. Also the ScrollTrigger's trigger. */
  containerRef: RefObject<HTMLElement | null>;
  /** True once the file is buffered *and* a seek has been verified. */
  ready: boolean;
  /** False under prefers-reduced-motion — no pin, no scrub, no seeking. */
  enabled: boolean;
  /**
   * Called with the progress of the frame actually on screen (0–1).
   *
   * Fires on the rAF loop, so implementations must write to the DOM directly.
   * A setState here would re-render the page every frame — every overlay beat
   * is driven from this one value for exactly that reason.
   */
  onProgress?: (progress: number) => void;
}

/**
 * Maps scroll position onto `video.currentTime`.
 *
 * The pipeline is deliberately one-directional and single-looped:
 *
 *   scroll → Lenis → ScrollTrigger.update → onUpdate writes `targetTime`
 *          → gsap.ticker lerps toward it → one `currentTime` write per frame
 *
 * ScrollTrigger never seeks. It only records where the scrub *should* be.
 * Seeking from its callback couples decode work to scroll-event frequency,
 * which is what makes these sequences snap under fast input.
 *
 * `scrub: true`, not a number: all smoothing lives in the lerp below. Stacking
 * ScrollTrigger's own scrub smoothing on top of it produces mushy lag where
 * the video visibly trails the scroll.
 *
 * `.play()` is never called. The frame on screen is a pure function of scroll.
 */
export function useScrollVideo({
  videoRef,
  containerRef,
  ready,
  enabled,
  onProgress,
}: UseScrollVideoOptions) {
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || !ready || !enabled) return;

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    video.pause();

    /** Written by ScrollTrigger. Read by the ticker. Never read by React. */
    let targetTime = 0;
    /** The smoothed head position, in seconds. Continuous. */
    let head = 0;
    /** Index of the frame currently on screen, so we never seek to it twice. */
    let writtenFrame = -1;
    /** Last progress reported, to avoid pointless DOM writes downstream. */
    let reported = -1;

    const maxTime = Math.max(0, duration - TAIL_GUARD);
    const lastFrame = Math.max(0, Math.floor(maxTime * HERO_FPS));
    const scrollLength = Math.round(duration * HERO_FPS * PIXELS_PER_FRAME);

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      // A function so a refresh re-derives it rather than freezing the first
      // measurement.
      end: () => `+=${scrollLength}`,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: true,
      invalidateOnRefresh: true,
      // Promote the pinned wrapper only while it is actually being moved.
      // Leaving will-change on permanently keeps a compositor layer alive for
      // the whole page.
      onToggle: (self) => {
        container.style.willChange = self.isActive ? 'transform' : '';
      },
      onUpdate: (self) => {
        targetTime = self.progress * maxTime;
      },
    });

    const tick = (_time: number, deltaMs: number) => {
      // Frame-rate independent lerp: identical feel at 60, 90 and 120Hz.
      // Clamp delta so a stalled tab doesn't teleport the head.
      const factor = 1 - Math.pow(1 - LERP, Math.min(deltaMs, 50) / (1000 / 60));
      head += (targetTime - head) * factor;

      // Snap once we're inside a tenth of a frame — an asymptote here would
      // keep the loop running forever without ever changing what's on screen.
      if (Math.abs(targetTime - head) < FRAME * 0.1) head = targetTime;

      // Quantise to a frame index before writing. This is the guard that makes
      // the sequence smooth: a seek that resolves to the frame already on
      // screen costs a full decode and shows nothing, and a stream of them is
      // exactly what reads as hitching. One seek per distinct frame, never
      // more — which is the same thing as skipping deltas below 1/fps.
      const frame = Math.min(lastFrame, Math.max(0, Math.floor(head * HERO_FPS)));
      if (frame !== writtenFrame) {
        writtenFrame = frame;
        // Aim at the middle of the frame's interval rather than its edge, so
        // float error can't land the decoder on the neighbouring frame.
        // Write-only: nothing in this loop reads layout, so it cannot thrash.
        video.currentTime = (frame + 0.5) / HERO_FPS;
      }

      const progress = head / maxTime;
      if (onProgress && Math.abs(progress - reported) > 0.0004) {
        reported = progress;
        onProgress(progress);
      }
    };

    gsap.ticker.add(tick);

    /**
     * Re-measure on viewport changes only — never mid-scroll. A refresh during
     * an active scroll re-runs layout on every pinned element and shows up as
     * a long task right in the middle of the sequence.
     */
    let refreshTimer = 0;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        if (ScrollTrigger.isScrolling()) {
          scheduleRefresh();
          return;
        }
        ScrollTrigger.refresh();
      }, 200);
    };

    window.addEventListener('resize', scheduleRefresh);
    window.addEventListener('orientationchange', scheduleRefresh);

    // One refresh at arm time: everything measured while the loader was up is
    // stale, and this is the last quiet moment before the sequence is live.
    ScrollTrigger.refresh();

    return () => {
      window.clearTimeout(refreshTimer);
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', scheduleRefresh);
      window.removeEventListener('orientationchange', scheduleRefresh);
      container.style.willChange = '';
      trigger.kill();
    };
  }, [videoRef, containerRef, ready, enabled, onProgress]);
}
