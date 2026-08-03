import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './Loader.module.css';
import { EASE, DUR } from '../../lib/easing';

interface LoaderProps {
  /** 0–1. Real bytes-received progress, not a fake timer. */
  progress: number;
  /** True once the video is buffered and the scrub is armed. */
  done: boolean;
}

function LoaderBase({ progress, done }: LoaderProps) {
  const percent = Math.round(progress * 100);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className={styles.root}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.enterSlow, ease: EASE }}
          role="status"
          aria-live="polite"
        >
          <div className={styles.inner}>
            <p className={styles.wordmark}>Chilly</p>
            <div className={styles.track}>
              <div
                className={styles.bar}
                style={{ transform: `scaleX(${progress})` }}
              />
            </div>
            <p className={styles.percent}>
              <span className="visuallyHidden">Loading, </span>
              {percent}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Loader = memo(LoaderBase);
