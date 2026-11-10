import { strings } from '@/content/strings';
import { Check, Clock, TriangleAlert } from '@/design/icons';
import type { SaveState } from '@/features/workspace/workspaceStore';
import { formatTime } from '@/content/format';
import styles from './SaveStatus.module.css';

const t = strings.workspace.save;

/** Autosave status. Polite, not assertive: a background save isn't urgent (docs/06). */
export function SaveStatus({ state }: { state: SaveState }) {
  let content = null;
  if (state.state === 'saving') content = <><Clock size={16} aria-hidden /> {t.saving}</>;
  if (state.state === 'saved') content = <><Check size={16} aria-hidden className={styles.ok} /> {t.saved(formatTime(state.at))}</>;
  if (state.state === 'retrying') content = <><TriangleAlert size={16} aria-hidden className={styles.warn} /> {t.retrying}</>;
  return (
    <p className={`${styles.status} ${state.state === 'retrying' ? styles.retrying : ''}`} role="status" aria-live="polite">
      {content}
    </p>
  );
}
