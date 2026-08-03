import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from './Cursor.module.css';

/**
 * A single dot that trails the pointer and inverts whatever it sits on.
 *
 * `mix-blend-mode: difference` on a white dot does the inversion for free:
 * black on the paper background, white over the video and over solid ink
 * buttons — no state tracking of what's underneath.
 *
 * Never mounted on touch or under reduced motion (see App). All updates are
 * direct transform writes on GSAP's shared ticker; this component renders
 * exactly once.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;

    document.documentElement.setAttribute('data-cursor-active', 'true');

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let x = pointerX;
    let y = pointerY;
    let visible = false;

    const setX = gsap.quickSetter(dot, 'x', 'px') as (value: number) => void;
    const setY = gsap.quickSetter(dot, 'y', 'px') as (value: number) => void;

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!visible) {
        // Snap on first sight so the dot doesn't fly in from centre screen.
        x = pointerX;
        y = pointerY;
        visible = true;
        dot.classList.add(styles.visible);
      }
    };

    const onPointerOver = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const interactive = target?.closest?.('a, button, [data-cursor]');
      dot.classList.toggle(styles.active, Boolean(interactive));
    };

    const onLeave = () => dot.classList.remove(styles.visible);
    const onEnter = () => {
      if (visible) dot.classList.add(styles.visible);
    };

    const tick = (_time: number, deltaMs: number) => {
      // Frame-rate independent chase — quick enough to feel attached,
      // slow enough to have weight.
      const factor = 1 - Math.pow(1 - 0.35, Math.min(deltaMs, 50) / (1000 / 60));
      x += (pointerX - x) * factor;
      y += (pointerY - y) * factor;
      setX(x);
      setY(y);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    gsap.ticker.add(tick);

    return () => {
      document.documentElement.removeAttribute('data-cursor-active');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div className={styles.root} aria-hidden="true">
      <div ref={dotRef} className={styles.dot} />
    </div>
  );
}
