#!/usr/bin/env bash
#
# Re-encodes the hero footage for scroll scrubbing.
#
# The critical flag is `-g 1`: every frame becomes a keyframe, so a seek to an
# arbitrary timestamp lands immediately instead of decoding forward from the
# nearest I-frame. Normal web encodes use a keyframe every 2–10s, which is why
# naive scrub-video implementations hitch — each seek silently decodes dozens
# of frames first.
#
# All-intra costs roughly 4–6x the file size. For a scrub hero that is the
# correct trade: the file is fully buffered before the sequence is armed, so
# the cost is paid once, up front, behind a determinate loading state.
#
# Usage: ./scripts/encode-hero.sh <source.mp4>

set -euo pipefail

SRC="${1:?usage: encode-hero.sh <source.mp4>}"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public"
FFMPEG="$(node -e "process.stdout.write(require('ffmpeg-static'))")"

# Target frame rate. The master is 24fps, which gives only 192 frames to scrub
# through — long enough pins start showing that quantisation as stepping. We
# motion-interpolate to 48fps so the sequence can be scrubbed slowly and still
# change the image often enough to read as continuous.
#
# Must match HERO_FPS in src/hooks/useScrollVideo.ts.
FPS=48

# crf 22 rather than 18: doubling the frame count on an all-intra encode would
# otherwise double the file. At 48fps/crf22 the result is ~33MB, against ~26MB
# for the old 24fps/crf18 — twice the frames for a quarter more bytes.
INTERP="minterpolate=fps=$FPS:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"

echo "→ H.264 all-intra @ ${FPS}fps (motion-interpolated)"
"$FFMPEG" -y -hide_banner -loglevel error -i "$SRC" \
  -vf "$INTERP" \
  -c:v libx264 -profile:v high -crf 22 \
  -g 1 -keyint_min 1 -sc_threshold 0 -an \
  -movflags +faststart -pix_fmt yuv420p \
  "$OUT_DIR/chilly-hero.mp4"

# VP9 is a codec fallback, not a bandwidth win. All-intra VP9 on this footage
# encodes *larger* than H.264 at every quality level tested — at 48fps/crf40 it
# was still climbing past 38MB against the MP4's 23MB. It is only ever reached
# by a build shipping without H.264, which in practice is nobody.
#
# So it is deliberately encoded at 720p: a fallback that nobody downloads has
# no business being the largest asset in the deploy. Anyone who does hit it
# gets a softer hero rather than a 40MB one.
echo "→ VP9 all-intra @ ${FPS}fps, 720p (fallback)"
"$FFMPEG" -y -hide_banner -loglevel error -i "$SRC" \
  -vf "$INTERP,scale=1280:720" \
  -c:v libvpx-vp9 -crf 42 -b:v 0 \
  -g 1 -keyint_min 1 -sc_threshold 0 -an \
  -deadline good -cpu-used 5 -row-mt 1 -pix_fmt yuv420p \
  "$OUT_DIR/chilly-hero.webm"

echo "→ done"
ls -lh "$OUT_DIR"/chilly-hero.*
