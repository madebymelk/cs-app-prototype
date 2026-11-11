import { useEffect, useRef } from 'react';
import { Button } from '@/components/Button/Button';
import { CopyButton } from '@/components/CopyButton/CopyButton';
import { strings } from '@/content/strings';
import styles from './records.module.css';

const t = strings.records.joinNetwork;

export function JoinNetworkPanel({ onClose }: { onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <section className={styles.panel} aria-labelledby="join-title">
      <h3 id="join-title" ref={heading} tabIndex={-1} className={styles.panelTitle}>{t.title}</h3>
      <p>{t.body}</p>
      <div className={styles.script}>
        <h4 className={styles.legend}>{strings.records.disclosure}</h4>
        <p>{t.script}</p>
        <CopyButton value={t.script} label={strings.records.disclosure} />
      </div>
      <div className={styles.actions}>
        <Button onPress={onClose}>{t.close}</Button>
      </div>
    </section>
  );
}
