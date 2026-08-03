import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';

import { Nav } from './components/Nav/Nav';
import { Cursor } from './components/Cursor/Cursor';
import { Loader } from './components/Loader/Loader';
import { ScrollVideoHero } from './components/ScrollVideoHero/ScrollVideoHero';

import { useLenis } from './hooks/useLenis';
import { useHeroVideo } from './hooks/useHeroVideo';
import { usePrefersReducedMotion, useFinePointer } from './hooks/useReducedMotion';
import { setScrollLocked } from './lib/smoothScroll';
import { EASE } from './lib/easing';

// Everything below the fold is split out — none of it is needed to paint the
// hero, and the hero is the only thing on screen for the first two viewports.
const Features = lazy(() => import('./components/Features/Features'));
const Product = lazy(() => import('./components/Product/Product'));
const Story = lazy(() => import('./components/Story/Story'));
const Footer = lazy(() => import('./components/Footer/Footer'));

/**
 * If the media element never reports `canplaythrough` — some mobile browsers
 * are stingy about it even with a fully buffered blob — arm the scrub anyway
 * rather than trapping the user behind the loader.
 */
const READY_TIMEOUT_MS = 6000;

export default function App() {
  const reduced = usePrefersReducedMotion();
  const finePointer = useFinePointer();

  useLenis(!reduced);

  const { url, progress } = useHeroVideo();
  const [videoReady, setVideoReady] = useState(false);

  const handleVideoReady = useCallback(() => setVideoReady(true), []);

  // Safety net around canplaythrough.
  useEffect(() => {
    if (!url || videoReady) return;
    const timer = window.setTimeout(() => setVideoReady(true), READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [url, videoReady]);

  // Hold the page at the top until the sequence can actually be scrubbed —
  // scrolling into an unbuffered pin is how these pages feel broken.
  useEffect(() => {
    setScrollLocked(!videoReady);
    return () => setScrollLocked(false);
  }, [videoReady]);

  // Note: the post-load ScrollTrigger.refresh() lives in useScrollVideo, at
  // the moment the sequence arms. Refreshing from here too would run a second
  // full re-measure for nothing.

  // The download is most of the wait; the last sliver is decode.
  const loaderProgress = videoReady ? 1 : progress * 0.96;

  return (
    <MotionConfig reducedMotion="user" transition={{ ease: EASE }}>
      <a className="skipLink" href="#features">
        Skip to content
      </a>

      <Nav />

      <main id="main">
        <ScrollVideoHero src={url} reduced={reduced} onReady={handleVideoReady} />

        <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
          <Features />
          <Product />
          <Story />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>

      {finePointer && !reduced && <Cursor />}

      <Loader progress={loaderProgress} done={videoReady} />
    </MotionConfig>
  );
}
