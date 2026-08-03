import { memo } from 'react';
import styles from './Footer.module.css';
import { scrollToTarget } from '../../lib/smoothScroll';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'The Can', href: '#product' },
      { label: 'Story', href: '#story' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Stockists', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Press', href: '#' },
    ],
  },
];

function FooterBase() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.wordmark}>Chilly</p>
          <p className={styles.tagline}>Cold. Clean. Focused.</p>
        </div>

        <nav className={styles.columns} aria-label="Footer">
          {COLUMNS.map((column) => (
            <div className={styles.column} key={column.title}>
              <p className={styles.columnTitle}>{column.title}</p>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      className={styles.link}
                      href={link.href}
                      data-cursor="target"
                      onClick={(event) => {
                        if (!link.href.startsWith('#') || link.href === '#') return;
                        event.preventDefault();
                        scrollToTarget(link.href);
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.base}>
        <p>© {new Date().getFullYear()} Chilly</p>
        <p>330 ml · Serve at 2–4 °C</p>
      </div>
    </footer>
  );
}

export const Footer = memo(FooterBase);
export default Footer;
