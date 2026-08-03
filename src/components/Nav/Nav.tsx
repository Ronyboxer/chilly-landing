import { memo, useEffect, useRef } from 'react';
import styles from './Nav.module.css';
import { scrollToTarget } from '../../lib/smoothScroll';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Product', href: '#product' },
  { label: 'Story', href: '#story' },
];

/** How far past the top before the bar earns its backdrop. */
const CONDENSE_AT = 120;
/** Ignore direction flips smaller than this — jitter shouldn't toggle the nav. */
const DIRECTION_THRESHOLD = 8;

/**
 * Hides on scroll down, returns on scroll up, and picks up a blur backdrop
 * once it's off the hero.
 *
 * Class names are toggled straight on the node rather than held in state.
 * This component renders exactly once for the life of the page — nothing in
 * the scroll path is allowed to schedule React work while the hero is being
 * scrubbed.
 */
function NavBase() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    let lastY = window.scrollY;
    let hidden = false;
    let condensed = false;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      if (Math.abs(delta) > DIRECTION_THRESHOLD) {
        const nextHidden = delta > 0 && y > CONDENSE_AT;
        if (nextHidden !== hidden) {
          hidden = nextHidden;
          nav.classList.toggle(styles.hidden, hidden);
        }
        lastY = y;
      }

      const nextCondensed = y > CONDENSE_AT;
      if (nextCondensed !== condensed) {
        condensed = nextCondensed;
        nav.classList.toggle(styles.condensed, condensed);
      }
    };

    // Lenis drives the real scroll position, so the native event is accurate
    // and stays correct if Lenis is disabled for reduced motion.
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header ref={navRef} className={styles.nav}>
      <nav className={styles.inner} aria-label="Primary">
        <a
          className={styles.wordmark}
          href="#top"
          data-cursor="target"
          onClick={(event) => {
            event.preventDefault();
            scrollToTarget('#top');
          }}
        >
          Chilly
        </a>

        <ul className={styles.links}>
          {LINKS.map(({ label, href }) => (
            <li key={href}>
              <a
                className={styles.link}
                href={href}
                data-cursor="target"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToTarget(href);
                }}
              >
                <span className={styles.linkLabel}>{label}</span>
                <span className={styles.linkRule} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export const Nav = memo(NavBase);
