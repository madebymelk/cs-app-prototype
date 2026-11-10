import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from '@/design/icons';
import styles from './InlineAlert.module.css';

type Tone = 'info' | 'success' | 'warning' | 'error';
const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert } as const;

/** Status is icon + text + color (never color alone). Text stays ink on tinted backgrounds. */
export function InlineAlert({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  const Icon = ICONS[tone];
  return (
    <div className={`${styles.alert} ${styles[tone]}`} role={tone === 'error' ? 'alert' : undefined}>
      <Icon className={styles.icon} size={20} aria-hidden />
      <div>
        <p className={styles.title}>{title}</p>
        {children ? <div className={styles.body}>{children}</div> : null}
      </div>
    </div>
  );
}
