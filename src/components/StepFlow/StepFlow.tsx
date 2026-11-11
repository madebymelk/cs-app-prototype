import { useEffect, useRef, type ReactNode } from 'react';
import { strings } from '@/content/strings';
import { Check } from '@/design/icons';
import styles from './StepFlow.module.css';

/** Guided multi-step flow with a visible step list (aria-current="step"); focus moves to each step's heading. */
export function StepFlow({
  title,
  steps,
  current,
  intro,
  children,
}: {
  title: string;
  steps: readonly string[];
  current: number;
  intro?: string;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [current]);
  return (
    <section className={styles.flow} aria-labelledby="stepflow-title">
      <h3 id="stepflow-title" className={styles.title}>{title}</h3>
      {intro ? <p className={styles.muted}>{intro}</p> : null}
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li
            key={s}
            className={`${styles.step} ${i < current ? styles.done : ''} ${i === current ? styles.current : ''}`}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className={styles.marker} aria-hidden>{i < current ? <Check size={14} /> : i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <h4 ref={heading} tabIndex={-1} className={styles.stepTitle}>
        {strings.records.stepOf(current + 1, steps.length, steps[current] ?? '')}
      </h4>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
