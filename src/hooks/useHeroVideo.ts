import { useEffect, useState } from 'react';
import { loadHeroVideo, subscribeToProgress } from '../lib/videoLoader';

interface HeroVideoState {
  /** Object URL for the fully buffered file, or null while downloading. */
  url: string | null;
  /** 0–1 download progress, for the determinate loading line. */
  progress: number;
}

/**
 * Subscribes to the shared hero-video download.
 *
 * This is the only place the video pipeline touches React state, and it stops
 * updating the moment the download finishes — nothing here re-renders during
 * the scrub.
 */
export function useHeroVideo(): HeroVideoState {
  const [url, setUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToProgress((next) => {
      if (active) setProgress(next);
    });

    loadHeroVideo().then((objectUrl) => {
      if (active) setUrl(objectUrl);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { url, progress };
}
