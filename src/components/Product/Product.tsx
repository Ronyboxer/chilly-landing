import { memo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import styles from './Product.module.css';
import { EASE, DUR } from '../../lib/easing';
import { useHeroVideo } from '../../hooks/useHeroVideo';
import { useParallax } from '../../hooks/useParallax';
import { usePrefersReducedMotion } from '../../hooks/useReducedMotion';

const SPECS = [
  { label: 'Volume', value: '330 ml' },
  { label: 'Caffeine', value: '80 mg — green tea' },
  { label: 'Sugar', value: '0 g' },
  { label: 'Serve', value: '2–4 °C' },
  { label: 'Body', value: 'Recycled aluminium' },
];

/**
 * The can render is the final frame of the hero footage, parked.
 *
 * It reuses the object URL the hero already buffered, so this costs no extra
 * bytes — and it is, by definition, a perfect match for the shot the sequence
 * resolves on.
 */
function ProductCan() {
  const { url } = useHeroVideo();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoadedData = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, video.duration - 0.05);
  }, []);

  return (
    <div className={styles.canFrame}>
      {url ? (
        <video
          ref={videoRef}
          className={styles.can}
          src={url}
          onLoadedData={handleLoadedData}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : (
        <div className={styles.canPlaceholder} aria-hidden="true" />
      )}
    </div>
  );
}

function ProductBase() {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const figureRef = useRef<HTMLElement>(null);

  // Deliberately small. Parallax that announces itself is parallax that ages.
  useParallax(figureRef, 48, !reduced);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="product"
      aria-labelledby="product-title"
    >
      <div className={styles.inner}>
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px -15% 0px' }}
          transition={{ duration: DUR.enterSlow, ease: EASE }}
        >
          <p className={styles.label}>The Can</p>
          <h2 className={styles.heading} id="product-title">
            One size.
            <br />
            One temperature.
          </h2>
        </motion.header>

        {/* Breaks the grid: pushed above the heading's baseline and bled off
            the right edge of the viewport. The composition is the point. */}
        <motion.figure
          ref={figureRef}
          className={styles.figure}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
          transition={{ duration: DUR.enterSlow, ease: EASE }}
        >
          {/* The float is a CSS keyframe, not a JS animation: an infinitely
              repeating Framer animation keeps a second frame loop alive for
              the whole session, including while the hero is being scrubbed. */}
          <div className={styles.float}>
            <ProductCan />
          </div>
        </motion.figure>

        <motion.dl
          className={styles.specs}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px -15% 0px' }}
          transition={{ duration: DUR.enterSlow, ease: EASE, delay: 0.08 }}
        >
          {SPECS.map(({ label, value }) => (
            <div className={styles.spec} key={label}>
              <dt className={styles.specLabel}>{label}</dt>
              <dd className={styles.specValue}>{value}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

export const Product = memo(ProductBase);
export default Product;
