import { forwardRef } from 'react';
import { CircleAlert } from '@/design/icons';
import styles from './ErrorSummary.module.css';

export interface SummaryItem {
  targetId: string;
  message: string;
}

/** Shown at the top of a form on submit; focus moves here; each item links to its field (docs/04, docs/06). */
export const ErrorSummary = forwardRef<HTMLDivElement, { title: string; items: SummaryItem[] }>(function ErrorSummary(
  { title, items },
  ref,
) {
  return (
    <div ref={ref} className={styles.summary} tabIndex={-1} role="alert" aria-labelledby="error-summary-title">
      <h2 id="error-summary-title" className={styles.title}>
        <CircleAlert size={20} aria-hidden className={styles.icon} />
        {title}
      </h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={`${item.targetId}-${item.message}`}>
            <a
              href={`#${item.targetId}`}
              onClick={(e) => {
                const el = document.getElementById(item.targetId);
                if (!el) return;
                e.preventDefault();
                el.scrollIntoView({ block: 'center' });
                el.focus();
              }}
            >
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
});
