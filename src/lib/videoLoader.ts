/**
 * Buffers the hero video into memory once, for the whole app.
 *
 * Scrubbing a partially buffered file is the single biggest source of visible
 * frame drops: every seek past the buffered edge resolves late, which reads
 * as a stutter. `preload="auto"` is only a hint and browsers routinely ignore
 * it, so we stream the file ourselves and hand the element an object URL
 * backed by a complete Blob. The determinate loading line is a free side
 * effect of doing it this way.
 *
 * Module-scoped so React StrictMode's double-mount — and the second <video>
 * in the Product section — all share one download.
 */

/**
 * Candidate encodes, best first. Both are all-intra (`-g 1`), which is what
 * makes seeks frame-accurate; see scripts/encode-hero.sh.
 *
 * MP4 leads deliberately. On this footage all-intra VP9 encodes *larger* than
 * H.264 at equivalent quality, so WebM earns its place only as a codec
 * fallback for builds without H.264 — never as the preferred download.
 */
const SOURCES = [
  { src: '/chilly-hero.mp4', type: 'video/mp4; codecs="avc1.640028"' },
  { src: '/chilly-hero.webm', type: 'video/webm; codecs="vp9"' },
] as const;

type ProgressListener = (progress: number) => void;

const listeners = new Set<ProgressListener>();
let inflight: Promise<string> | null = null;
let progress = 0;

function emit(next: number) {
  progress = next;
  for (const listener of listeners) listener(next);
}

export function subscribeToProgress(listener: ProgressListener): () => void {
  listeners.add(listener);
  listener(progress);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The same negotiation a `<source>` list performs, done in JS because we need
 * to know *which* file to stream into a Blob. A `<source>` list and a blob src
 * are mutually exclusive — the element can only load one URL — so the choice
 * has to happen before the fetch.
 */
function pickSource(): string {
  const probe = document.createElement('video');
  for (const candidate of SOURCES) {
    if (probe.canPlayType(candidate.type) === 'probably') return candidate.src;
  }
  for (const candidate of SOURCES) {
    if (probe.canPlayType(candidate.type)) return candidate.src;
  }
  return SOURCES[0].src;
}

async function stream(src: string): Promise<string> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to load ${src}: ${response.status}`);

  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body || !total) {
    // No stream or no length — fall back to a plain blob with no fine-grained
    // progress. Still fully buffered, which is the part that matters.
    const blob = await response.blob();
    emit(1);
    return URL.createObjectURL(blob);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let lastEmitted = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    const next = Math.min(0.995, received / total);
    // Emit on ~1% steps: the loading line is 1px tall, it does not need
    // thousands of updates, and each one is a React render.
    if (next - lastEmitted >= 0.01) {
      lastEmitted = next;
      emit(next);
    }
  }

  emit(1);
  const type = src.endsWith('.webm') ? 'video/webm' : 'video/mp4';
  return URL.createObjectURL(new Blob(chunks as BlobPart[], { type }));
}

export function loadHeroVideo(): Promise<string> {
  if (!inflight) {
    const src = pickSource();
    inflight = stream(src).catch((error) => {
      // Streaming failed (offline, CORS, quota) — let the element load the URL
      // directly. Scrubbing degrades to whatever the browser buffers, but the
      // page still works.
      console.warn('[chilly] falling back to direct video src', error);
      emit(1);
      return src;
    });
  }
  return inflight;
}
