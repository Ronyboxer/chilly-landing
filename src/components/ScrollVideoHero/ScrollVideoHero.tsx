import { memo, useCallback, useEffect, useRef, useState } from 'react';
import styles from './ScrollVideoHero.module.css';
import { useScrollVideo } from '../../hooks/useScrollVideo';
import { clamp01, easedRange } from '../../lib/easing';
import { Button } from '../ui/Button';

/**
 * Where each element of the overlay resolves, as a window on scrub progress.
 * The arc of the footage is: ice → cracks → frost → detonation → shards →
 * the can, clean. Everything below lands over that last beat.
 */
const REVEAL = {
  eyebrow: [0.74, 0.86],
  headline: [0.78, 0.9],
  subtitle: [0.83, 0.94],
  actions: [0.87, 0.98],
} as const;

/** Progress at which the veil starts lifting the type off the footage. */
const VEIL = [0.72, 1] as const;
const VEIL_MAX = 0.74;

/** Actions become focusable once they're substantially on screen. */
const ACTIONS_LIVE_AT = 0.9;

interface ScrollVideoHeroProps {
  /** Object URL of the buffered file, or null while it downloads. */
  src: string | null;
  reduced: boolean;
  /** Fired once the sequence is armed. */
  onReady: () => void;
}

/**
 * Confirms the decoder will actually honour a seek before we arm the scrub.
 * `canplaythrough` says the file is buffered; it does not say the first seek
 * will resolve promptly. Arming on the event alone is how the first few
 * scrolls end up showing a stale frame.
 */
function verifySeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', done);
      window.clearTimeout(timer);
      resolve();
    };

    video.addEventListener('seeked', done);
    // A seek to a position we're already at fires nothing, so give the event
    // a beat and then continue regardless.
    const timer = window.setTimeout(done, 400);
    video.currentTime = 0;
  });
}

function ScrollVideoHeroBase({ src, reduced, onReady }: ScrollVideoHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLSpanElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const [armed, setArmed] = useState(false);
  const armingRef = useRef(false);

  /**
   * Cache of the last value written to each overlay element. Progress ticks
   * every frame but these beats only move during the last quarter of the
   * sequence — without this we'd dirty five elements' styles 24 times a second
   * for no visual change.
   */
  const last = useRef({ veil: -1, eyebrow: -1, headline: -1, subtitle: -1, actions: -1, hint: -1 });

  /**
   * The only consumer of scrub progress, and the only thing that moves the
   * overlay. No component re-renders while this is running.
   */
  const applyProgress = useCallback((progress: number) => {
    const cache = last.current;

    const veil = veilRef.current;
    const veilT = easedRange(progress, VEIL[0], VEIL[1]);
    if (veil && veilT !== cache.veil) {
      cache.veil = veilT;
      veil.style.opacity = String(veilT * VEIL_MAX);
    }

    const eyebrow = eyebrowRef.current;
    const eyebrowT = easedRange(progress, REVEAL.eyebrow[0], REVEAL.eyebrow[1]);
    if (eyebrow && eyebrowT !== cache.eyebrow) {
      cache.eyebrow = eyebrowT;
      eyebrow.style.opacity = String(eyebrowT);
      eyebrow.style.transform = `translate3d(0, ${(1 - eyebrowT) * 16}px, 0)`;
    }

    // The headline is clipped, not faded: it rides up out of its own mask.
    const headline = headlineRef.current;
    const headlineT = easedRange(progress, REVEAL.headline[0], REVEAL.headline[1]);
    if (headline && headlineT !== cache.headline) {
      cache.headline = headlineT;
      headline.style.transform = `translate3d(0, ${(1 - headlineT) * 105}%, 0)`;
    }

    const subtitle = subtitleRef.current;
    const subtitleT = easedRange(progress, REVEAL.subtitle[0], REVEAL.subtitle[1]);
    if (subtitle && subtitleT !== cache.subtitle) {
      cache.subtitle = subtitleT;
      subtitle.style.opacity = String(subtitleT);
      subtitle.style.transform = `translate3d(0, ${(1 - subtitleT) * 24}px, 0)`;
    }

    const actions = actionsRef.current;
    const actionsT = easedRange(progress, REVEAL.actions[0], REVEAL.actions[1]);
    if (actions && actionsT !== cache.actions) {
      cache.actions = actionsT;
      actions.style.opacity = String(actionsT);
      actions.style.transform = `translate3d(0, ${(1 - actionsT) * 28}px, 0)`;

      // Keep the buttons out of the tab order until they're actually there.
      const live = progress > ACTIONS_LIVE_AT;
      if (live === actions.hasAttribute('inert')) {
        if (live) actions.removeAttribute('inert');
        else actions.setAttribute('inert', '');
      }
    }

    const bar = barRef.current;
    if (bar) bar.style.transform = `scaleX(${progress})`;

    const hint = hintRef.current;
    const hintT = 1 - clamp01(progress / 0.05);
    if (hint && hintT !== cache.hint) {
      cache.hint = hintT;
      hint.style.opacity = String(hintT);
    }
  }, []);

  useScrollVideo({
    videoRef,
    containerRef: sectionRef,
    ready: armed,
    enabled: !reduced,
    onProgress: applyProgress,
  });

  const handleCanPlayThrough = useCallback(() => {
    const video = videoRef.current;
    if (!video || armingRef.current) return;
    armingRef.current = true;

    // Gate on a verified seek, not just on the buffering event.
    verifySeek(video).then(() => {
      setArmed(true);
      onReady();
    });
  }, [onReady]);

  /**
   * Some mobile browsers never emit `canplaythrough`, even for a fully
   * buffered blob. If the decoder says it has enough data anyway, arm on that
   * rather than leaving the sequence dead.
   */
  useEffect(() => {
    if (!src || armed) return;
    const timer = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video || armingRef.current || video.readyState < 3) return;
      handleCanPlayThrough();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [src, armed, handleCanPlayThrough]);

  /**
   * iOS refuses to seek a media element that has never been handed a user
   * gesture. A muted play/pause inside the first interaction unlocks it; the
   * element is paused again before it can render a second frame, so this is
   * not playback.
   */
  useEffect(() => {
    if (reduced || !src) return;

    const unlock = () => {
      const video = videoRef.current;
      if (!video) return;
      const played = video.play();
      if (played && typeof played.then === 'function') {
        played.then(() => video.pause()).catch(() => {});
      } else {
        video.pause();
      }
    };

    const options = { once: true, passive: true } as const;
    window.addEventListener('touchstart', unlock, options);
    window.addEventListener('pointerdown', unlock, options);

    return () => {
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
  }, [reduced, src]);

  // Reduced motion: no scrub at all. Park the video on its final frame and
  // resolve the overlay statically, so the hero reads as a still photograph.
  useEffect(() => {
    if (!reduced) return;
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) {
      video.currentTime = Math.max(0, video.duration - 0.05);
    }
    // Not gated on `armed`: if the decoder never reports ready, a
    // reduced-motion user must still get working buttons.
    applyProgress(1);
  }, [reduced, armed, src, applyProgress]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className={`${styles.hero} ${reduced ? styles.static : ''}`}
      aria-label="Chilly product reveal"
    >
      <div className={styles.stage}>
        <video
          ref={videoRef}
          className={styles.video}
          src={src ?? undefined}
          onCanPlayThrough={handleCanPlayThrough}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* Solid paper veil — guarantees type contrast over any final frame
            without tinting, gradients, or a scrim that reads as decoration. */}
        <div ref={veilRef} className={styles.veil} aria-hidden="true" />

        <div className={styles.overlay}>
          <div className={styles.copy}>
            <p ref={eyebrowRef} className={styles.eyebrow}>
              Chilly · 330 ml
            </p>

            <h1 className={styles.headline}>
              <span className={styles.headlineMask}>
                <span ref={headlineRef} className={styles.headlineLine}>
                  Stay Chilly.
                </span>
              </span>
            </h1>

            <p ref={subtitleRef} className={styles.subtitle}>
              Cold. Clean. Focused.
            </p>

            <div ref={actionsRef} className={styles.actions} inert>
              <Button variant="solid">Get Chilly</Button>
              <Button variant="ghost" href="#story">
                Learn More
              </Button>
            </div>
          </div>
        </div>

        <div ref={hintRef} className={styles.hint} aria-hidden="true">
          <span className={styles.hintRule} />
          <span>Scroll</span>
        </div>

        {/* Hairline, not a bar. */}
        <div className={styles.progress} aria-hidden="true">
          <span ref={barRef} className={styles.progressBar} />
        </div>
      </div>
    </section>
  );
}

export const ScrollVideoHero = memo(ScrollVideoHeroBase);
