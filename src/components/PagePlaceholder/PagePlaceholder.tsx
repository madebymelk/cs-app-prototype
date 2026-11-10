import type { ReactNode } from 'react';
import { strings } from '@/content/strings';
import styles from './PagePlaceholder.module.css';

/** Stub page used until a route's milestone builds it. One h1 per view (docs/06). */
export function PagePlaceholder({ title, milestone, children }: { title: string; milestone: string; children?: ReactNode }) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.note}>{strings.placeholder.builtIn(milestone)}</p>
      {children}
    </div>
  );
}
