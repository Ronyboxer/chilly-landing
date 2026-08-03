import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import styles from './SplitLines.module.css';
import { EASE, DUR } from '../../lib/easing';

const group: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const line: Variants = {
  hidden: { y: '110%' },
  show: { y: '0%', transition: { duration: DUR.enterSlow, ease: EASE } },
};

interface SplitLinesProps {
  /** Authored line breaks — measured splitting is fragile and reflow-heavy. */
  lines: string[];
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div';
  className?: string;
  id?: string;
  /** Delay before the first line, in seconds. */
  delay?: number;
}

/**
 * Line-level reveal: each line rides up out of its own overflow mask, 60ms
 * apart. Per-line, never per-character — character staggers read as a demo.
 */
function SplitLinesBase({ lines, as = 'p', className, id, delay = 0 }: SplitLinesProps) {
  const Wrapper = motion[as];

  return (
    <Wrapper
      id={id}
      className={[styles.root, className].filter(Boolean).join(' ')}
      variants={group}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
      transition={{ delayChildren: delay }}
    >
      {lines.map((text, index) => (
        <span className={styles.mask} key={index}>
          <motion.span className={styles.line} variants={line}>
            {text}
          </motion.span>
        </span>
      ))}
    </Wrapper>
  );
}

export const SplitLines = memo(SplitLinesBase);
