# Chilly

Scroll-scrubbed product landing page. React + Vite + TypeScript, GSAP ScrollTrigger, Lenis, Framer Motion, CSS Modules.

```bash
npm install
npm run dev
```

## The hero asset

`public/chilly-hero.{mp4,webm}` are **all-intra, 48fps** encodes. Two things
matter, for two different reasons.

**Every frame is a keyframe** (`-g 1`). This is the difference between a scrub
that works and one that hitches. A normal web encode keys every few seconds, so
seeking to an arbitrary timestamp makes the decoder start at the previous
keyframe and decode forward to the target. The original master had **2
keyframes across 192 frames**, so a worst-case seek decoded ~95 frames before
showing anything.

**The 24fps master is motion-interpolated to 48fps.** Frame *count* is what
buys smoothness at long pin lengths. With only 192 frames, stretching the pin
means each frame holds for more scroll, which reads as stepping — px-per-frame
alone can only trade pace against smoothness. Doubling the frames breaks the
tie.

To regenerate from a new master:

```bash
./scripts/encode-hero.sh path/to/master.mp4
```

The output frame rate is set by `FPS` in that script and **must match
`HERO_FPS`** in `src/hooks/useScrollVideo.ts`, which drives both the pin length
and the seek quantiser.

MP4 is preferred at runtime; the WebM is a codec fallback only, and is
deliberately 720p. On this footage all-intra VP9 encodes *larger* than H.264 at
every quality level tested, so it is never the better download — and a file
that essentially nobody fetches has no business being the largest asset in the
deploy.

## How the scrub works

One rAF loop for the entire page. Lenis is stepped by `gsap.ticker`, and every
scroll-linked animation on the site goes through ScrollTrigger, so scroll
smoothing, pin, parallax and the video seek all resolve inside a single frame
in a fixed order.

```
scroll → Lenis → ScrollTrigger.update → onUpdate stores targetTime
       → gsap.ticker lerps head toward it → one currentTime write per frame
```

ScrollTrigger never seeks; it only records where the scrub should be. Seeking
from its callback couples decode work to scroll-event frequency, which is what
makes these sequences snap under fast input.

Invariants worth preserving:

- **No React state in the scroll path.** Overlay beats are written straight to
  the DOM from the ticker. If a component re-renders during a scrub, that's a bug.
- **One frame, one seek.** The head position is quantised to a frame index
  before writing, so a seek that would resolve to the frame already on screen
  never happens.
- **No `ScrollTrigger.refresh()` during active scroll.** Resize refreshes defer
  until `ScrollTrigger.isScrolling()` is false.
- **`will-change` is transient**, applied to the pinned wrapper only while it's
  active.
- Ambient loops (the floating can) are CSS keyframes, not JS animations — an
  infinitely repeating Framer animation would keep a second frame loop alive.

## Accessibility

Under `prefers-reduced-motion: reduce` the sequence is skipped entirely: no pin,
no scrub, no Lenis, no custom cursor. The hero renders as a still on the final
frame and sections lay out without motion.
