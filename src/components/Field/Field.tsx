import type { ReactNode } from 'react';
import { strings } from '@/content/strings';
import { CircleAlert } from '@/design/icons';
import styles from './Field.module.css';

export interface ControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}

/** Labelled field with hint and inline error wired via aria-describedby (docs/06). */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  children: (props: ControlProps) => ReactNode;
}) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');
  return (
    <div className={`${styles.field} ${error ? styles.invalid : ''}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span className={styles.required}> ({strings.workspace.form.required.toLowerCase()})</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          <CircleAlert size={16} aria-hidden /> {error}
        </p>
      ) : null}
      {children({
        id,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(error ? { 'aria-invalid': true } : {}),
        ...(required ? { 'aria-required': true } : {}),
      })}
    </div>
  );
}

/** Radio group with the same hint/error wiring, as a fieldset with a legend. */
export function RadioField({
  id,
  label,
  hint,
  error,
  required,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  value: string | undefined;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      className={`${styles.field} ${styles.fieldset} ${error ? styles.invalid : ''}`}
      {...(describedBy ? { 'aria-describedby': describedBy } : {})}
    >
      <legend className={styles.label}>
        {label}
        {required ? <span className={styles.required}> ({strings.workspace.form.required.toLowerCase()})</span> : null}
      </legend>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          <CircleAlert size={16} aria-hidden /> {error}
        </p>
      ) : null}
      <div className={styles.radios}>
        {options.map((o) => (
          <label key={o.value} className={styles.radio}>
            <input
              type="radio"
              name={id}
              value={o.value}
              checked={value === o.value}
              disabled={disabled}
              onChange={() => { onChange(o.value); }}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
