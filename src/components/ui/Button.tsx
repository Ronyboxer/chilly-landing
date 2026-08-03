import { memo } from 'react';
import type { ReactNode, MouseEvent } from 'react';
import styles from './Button.module.css';
import { scrollToTarget } from '../../lib/smoothScroll';

interface ButtonProps {
  children: ReactNode;
  variant?: 'solid' | 'ghost';
  /** In-page anchor. Navigation is handed to Lenis, never to the browser. */
  href?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Fill sweeps up from the bottom edge, label lifts 1px. Both states are
 * declared once for `:hover` and `:focus-visible` so keyboard users get the
 * same affordance as pointer users.
 */
function ButtonBase({ children, variant = 'solid', href, onClick, className }: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');

  const content = (
    <>
      <span className={styles.fill} aria-hidden="true" />
      <span className={styles.label}>{children}</span>
    </>
  );

  if (href) {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (!href.startsWith('#')) return;
      event.preventDefault();
      scrollToTarget(href);
      onClick?.();
    };

    return (
      <a className={classes} href={href} onClick={handleClick} data-cursor="target">
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} data-cursor="target">
      {content}
    </button>
  );
}

export const Button = memo(ButtonBase);
