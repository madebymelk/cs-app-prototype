import { Button as AriaButton, type ButtonProps } from 'react-aria-components';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

/** One primary button per region (docs/02). Verb-first labels (docs/04). */
export function Button({
  variant = 'secondary',
  compact = false,
  className,
  ...props
}: ButtonProps & { variant?: Variant; compact?: boolean; className?: string }) {
  return (
    <AriaButton
      {...props}
      className={[styles.button, styles[variant], compact ? styles.compact : '', className ?? ''].join(' ')}
    />
  );
}
