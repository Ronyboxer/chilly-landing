import { memo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import styles from './Features.module.css';
import { EASE, DUR } from '../../lib/easing';
import { usePrefersReducedMotion, useFinePointer } from '../../hooks/useReducedMotion';

const FEATURES = [
  {
    index: '01',
    title: 'Ice Cold Focus',
    body: 'Brewed at zero and held there. A clean lift with none of the spike, none of the crash — attention that stays where you put it.',
  },
  {
    index: '02',
    title: 'Clean Energy',
    body: 'Six ingredients. No sugar, no synthetic colour, nothing you need a chemistry degree to pronounce. What is in the can is on the can.',
  },
  {
    index: '03',
    title: 'Zero Distractions',
    body: 'No loyalty programme, no limited-edition flavour drops, no noise. One recipe, made properly, every single time.',
  },
];

/** Degrees of tilt at the far corner of the card. */
const MAX_TILT = 6;

const grid: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.enterSlow, ease: EASE } },
};

interface CardProps {
  index: string;
  title: string;
  body: string;
  /** False on touch and under reduced motion — no tilt, no light spot. */
  interactive: boolean;
}

function FeatureCard({ index, title, body, interactive }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  const write = useCallback(() => {
    frame.current = 0;
    const element = ref.current;
    if (!element) return;

    const { x, y } = pointer.current;
    // -0.5 … 0.5 from the centre of the card.
    element.style.setProperty('--ry', `${x * 2 * MAX_TILT}deg`);
    element.style.setProperty('--rx', `${-y * 2 * MAX_TILT}deg`);
    element.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
    element.style.setProperty('--my', `${(y + 0.5) * 100}%`);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const element = ref.current;
      if (!element) return;

      // One layout read per move, batched into the next frame's write.
      const rect = element.getBoundingClientRect();
      pointer.current = {
        x: (event.clientX - rect.left) / rect.width - 0.5,
        y: (event.clientY - rect.top) / rect.height - 0.5,
      };

      if (!frame.current) frame.current = requestAnimationFrame(write);
    },
    [interactive, write],
  );

  const handlePointerEnter = useCallback(() => {
    if (!interactive) return;
    // Drop the return transition so the card tracks the pointer 1:1.
    ref.current?.classList.remove(styles.resting);
  }, [interactive]);

  const handlePointerLeave = useCallback(() => {
    if (!interactive) return;
    const element = ref.current;
    if (!element) return;

    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }

    // Springy settle back to flat — the one place the site leaves expo-out.
    element.classList.add(styles.resting);
    element.style.setProperty('--rx', '0deg');
    element.style.setProperty('--ry', '0deg');
  }, [interactive]);

  return (
    <motion.li className={styles.cardWrap} variants={card}>
      <div
        ref={ref}
        className={`${styles.card} ${styles.resting}`}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <span className={styles.spot} aria-hidden="true" />
        <p className={styles.index}>{index}</p>
        <div className={styles.copy}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.body}>{body}</p>
        </div>
      </div>
    </motion.li>
  );
}

function FeaturesBase() {
  const reduced = usePrefersReducedMotion();
  const fine = useFinePointer();
  const interactive = fine && !reduced;

  return (
    <section className={styles.section} id="features" aria-labelledby="features-title">
      <div className={styles.inner}>
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px -15% 0px' }}
          transition={{ duration: DUR.enterSlow, ease: EASE }}
        >
          <p className={styles.label}>Features</p>
          <h2 className={styles.heading} id="features-title">
            Built for the quiet hours.
          </h2>
        </motion.header>

        <motion.ul
          className={styles.grid}
          variants={grid}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-10% 0px -15% 0px' }}
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.index} {...feature} interactive={interactive} />
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

export const Features = memo(FeaturesBase);
export default Features;
