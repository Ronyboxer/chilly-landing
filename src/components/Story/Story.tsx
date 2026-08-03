import { memo } from 'react';
import { motion } from 'framer-motion';
import styles from './Story.module.css';
import { SplitLines } from '../ui/SplitLines';
import { EASE, DUR } from '../../lib/easing';

/**
 * Line breaks are authored, not measured. Each string is kept under ~44
 * characters so it holds as a single line at the 700px measure — the reveal
 * masks depend on one line per string.
 */
const OPENING = ['We did not set out to make', 'another energy drink.'];

const BODY = [
  'We set out to make the one you reach for',
  'when the room finally goes quiet — when',
  'the notifications are off and the only',
  'thing left is the work.',
];

const CLOSING = ['Cold enough to wake you up.', 'Clean enough to stay out of the way.'];

const CODA = ['Everything else is noise.'];

function StoryBase() {
  return (
    <section className={styles.section} id="story" aria-labelledby="story-title">
      <div className={styles.inner}>
        <motion.p
          className={styles.label}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-20% 0px -20% 0px' }}
          transition={{ duration: DUR.enter, ease: EASE }}
        >
          Story
        </motion.p>

        <SplitLines as="h2" id="story-title" className={styles.heading} lines={OPENING} />

        <SplitLines as="p" className={styles.body} lines={BODY} delay={0.1} />

        <SplitLines as="p" className={styles.body} lines={CLOSING} delay={0.15} />

        <SplitLines as="p" className={styles.coda} lines={CODA} delay={0.2} />
      </div>
    </section>
  );
}

export const Story = memo(StoryBase);
export default Story;
