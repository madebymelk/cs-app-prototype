import type { ReactNode } from 'react';
import { formatDateTime, formatRelative } from '@/content/format';
import { strings } from '@/content/strings';
import { Lock } from '@/design/icons';
import styles from './ReadOnlyBlock.module.css';

/** Authoritative data: read-only surface, lock icon, source + freshness tag (docs/02). */
export function ReadOnlyBlock({
  title,
  headingLevel = 3,
  source,
  updatedAt,
  children,
}: {
  title: string;
  headingLevel?: 2 | 3 | 4;
  source: string;
  updatedAt?: string | undefined;
  children: ReactNode;
}) {
  const H = `h${String(headingLevel)}` as 'h2' | 'h3' | 'h4';
  return (
    <section className={styles.block} aria-label={title}>
      <div className={styles.head}>
        <H className={styles.title} tabIndex={-1}>
          <Lock size={16} aria-hidden className={styles.lock} />
          {title}
          <span className="visually-hidden"> ({strings.source.readOnly})</span>
        </H>
        <SourceTag source={source} updatedAt={updatedAt} />
      </div>
      {children}
    </section>
  );
}

export function SourceTag({ source, updatedAt }: { source: string; updatedAt?: string | undefined }) {
  return (
    <p className={styles.tag}>
      {strings.source.tag(source)}
      {updatedAt ? (
        <>
          {' · '}
          <time dateTime={updatedAt} title={formatDateTime(updatedAt)}>
            {strings.source.updated(formatRelative(updatedAt))}
          </time>
        </>
      ) : null}
    </p>
  );
}

/** Label/value pairs for read-only data. */
export function Facts({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className={styles.facts}>
      {items.map(([label, value]) => (
        <div key={label} className={styles.fact}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
