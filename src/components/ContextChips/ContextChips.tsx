import { strings } from '@/content/strings';
import type { LinkedRecord } from '@/domain/types';
import styles from './ContextChips.module.css';

/** Records associated with the case: auto first, manual additions marked (docs/03 F5, F8). */
export function ContextChips({ linked }: { linked: LinkedRecord[] }) {
  if (!linked.length) return null;
  return (
    <div className={styles.wrap}>
      <span className={styles.label} id="chips-label">{strings.context.chips.label}</span>
      <ul className={styles.list} aria-labelledby="chips-label">
        {linked.map((l) => (
          <li key={`${l.kind}:${l.refId}`} className={styles.chip}>
            <span>{l.label}</span>
            <span className="mono">{l.refId}</span>
            <span className={styles.by}>
              ({l.associatedBy === 'auto' ? strings.context.chips.auto : strings.context.chips.added})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
