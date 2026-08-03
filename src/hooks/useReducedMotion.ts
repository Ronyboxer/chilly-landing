import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function readPreference(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Live `prefers-reduced-motion`. Read synchronously on first render so the
 * very first paint is already correct — a reduced-motion user must never see
 * a frame of the pinned sequence before we tear it down.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPreference);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/** True only for real pointers — gates the custom cursor and card tilt. */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: fine)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(pointer: fine)');
    const onChange = (event: MediaQueryListEvent) => setFine(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return fine;
}
