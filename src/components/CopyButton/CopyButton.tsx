import { useState } from 'react';
import { Button } from 'react-aria-components';
import { Check, Copy } from '@/design/icons';
import { strings } from '@/content/strings';
import { announce } from '../LiveAnnouncer/announce';
import styles from './CopyButton.module.css';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      className={styles.button}
      aria-label={strings.copy.button(label)}
      onPress={() => {
        // Clipboard can be unavailable (insecure context, denied); the ID stays visible either way.
        navigator.clipboard.writeText(value).catch(() => undefined);
        setCopied(true);
        announce(strings.copy.copied);
        setTimeout(() => { setCopied(false); }, 1500);
      }}
    >
      {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
    </Button>
  );
}
