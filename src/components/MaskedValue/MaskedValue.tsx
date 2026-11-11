import { useState } from 'react';
import { strings } from '@/content/strings';
import { Button } from '../Button/Button';
import styles from './MaskedValue.module.css';

const t = strings.masked;

/**
 * Masked identifier (docs/06): screen readers hear "masked"; reveal is a labelled button, only for roles
 * with canRevealMasked, and every reveal is audited by the caller via onReveal.
 */
export function MaskedValue({
  value,
  label,
  visibleChars = 4,
  canReveal,
  onReveal,
}: {
  value: string;
  label: string;
  visibleChars?: number;
  canReveal: boolean;
  onReveal: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const tail = value.slice(-visibleChars);
  return (
    <span className={styles.wrap}>
      {revealed ? (
        <span className="mono">{value}</span>
      ) : (
        <span className="mono">
          <span aria-hidden>{'•'.repeat(Math.max(0, Math.min(8, value.length - visibleChars)))}</span>
          <span className="visually-hidden">{`${t.masked}, ending in`} </span>
          {tail}
        </span>
      )}
      {canReveal ? (
        <Button
          compact
          variant="quiet"
          onPress={() => {
            if (!revealed) onReveal();
            setRevealed((r) => !r);
          }}
        >
          {revealed ? t.hide(label) : t.reveal(label)}
        </Button>
      ) : null}
    </span>
  );
}
