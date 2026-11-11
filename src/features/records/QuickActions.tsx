import { strings } from '@/content/strings';
import { Button } from '@/components/Button/Button';
import styles from './records.module.css';

export type QuickAction = 'ucern' | 'vpern' | 'joinNetwork' | 'forms';

/** Quick actions on the case (F5): UCERN, VPERN, Join network, Forms. */
export function QuickActions({ onAction, disabled }: { onAction: (a: QuickAction) => void; disabled?: boolean }) {
  const q = strings.quickActions;
  return (
    <div className={styles.quick} role="group" aria-label={q.label}>
      <span className={styles.quickLabel}>{q.label}</span>
      <Button compact isDisabled={disabled} onPress={() => { onAction('ucern'); }} aria-description={q.ucernHint}>{q.ucern}</Button>
      <Button compact isDisabled={disabled} onPress={() => { onAction('vpern'); }} aria-description={q.vpernHint}>{q.vpern}</Button>
      <Button compact isDisabled={disabled} onPress={() => { onAction('joinNetwork'); }}>{q.joinNetwork}</Button>
      <Button compact isDisabled={disabled} onPress={() => { onAction('forms'); }}>{q.forms}</Button>
    </div>
  );
}
