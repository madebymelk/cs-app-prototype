import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { usePermission } from '@/app/usePermission';
import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { reasonLabel } from '@/components/InteractionHeader/InteractionHeader';
import { DESTINATIONS, type DestinationId } from '@/config/templates';
import { strings } from '@/content/strings';
import { Lock } from '@/design/icons';
import { missingTemplateFields, prefill, templateFor } from '@/domain/escalation';
import type { Case } from '@/domain/types';
import { submitEscalation } from '@/features/workspace/downstream';
import { announce } from '@/components/LiveAnnouncer/announce';
import styles from './downstream.module.css';

const t = strings.escalation;

/**
 * One escalation shell for every destination (docs/02, F14/F15). Destination comes from the final reason;
 * roles with canOverrideDestination can change it. The template is prefilled from the case.
 */
export function EscalationShell({ c, onDone, onCancel }: { c: Case; onDone: () => void; onCancel: () => void }) {
  const canOverride = usePermission('canOverrideDestination');
  const [override, setOverride] = useState<DestinationId | undefined>(undefined);
  const template = useMemo(() => templateFor(c.finalReason, override), [c.finalReason, override]);
  const [fields, setFields] = useState<Record<string, string>>(() => prefill(template, c));
  const [attachments, setAttachments] = useState<string[]>(t.attachmentOptions.slice(0, 1));
  const [attempted, setAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<{ correlationId?: string } | null>(null);
  const [retryId, setRetryId] = useState<string | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  const dest = t.destinations[template.destination] ?? template.destination;
  const missing = missingTemplateFields(template, fields);

  useEffect(() => { heading.current?.focus(); }, []);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setAttempted(true);
    if (missing.length) {
      document.getElementById(`esc-${missing[0] ?? ''}`)?.focus();
      return;
    }
    setSending(true);
    setFailure(null);
    const r = await submitEscalation(c.id, template, fields, attachments, retryId);
    setSending(false);
    if (r.ok) {
      announce(t.sent(dest, r.escalation.externalId ?? ''));
      onDone();
    } else {
      const latest = c.escalations.at(-1);
      setRetryId(latest?.status === 'failed' ? latest.id : retryId);
      setFailure(r.correlationId ? { correlationId: r.correlationId } : {});
    }
  };

  return (
    <section className={styles.shell} aria-labelledby="esc-title">
      <h3 id="esc-title" ref={heading} tabIndex={-1} className={styles.title}>{t.title}</h3>
      <p className={styles.muted}>{t.intro}</p>

      <div className={styles.row}>
        <div className={styles.readonly}>
          <span className={styles.label}><Lock size={16} aria-hidden /> {t.destination}</span>
          <strong>{dest}</strong>
          <span className={styles.muted}>
            {override ? t.changeDestination : c.finalReason ? t.destinationAuto(reasonLabel(c.finalReason) ?? '') : t.destinationDefault}
          </span>
        </div>
        {canOverride ? (
          <Field id="esc-destination" label={t.changeDestination}>
            {(p) => (
              <select
                {...p}
                value={template.destination}
                onChange={(e) => {
                  const next = e.target.value as DestinationId;
                  setOverride(next);
                  setFields((f) => ({ ...prefill(templateFor(c.finalReason, next), c), ...f }));
                }}
              >
                {DESTINATIONS.map((d) => <option key={d} value={d}>{t.destinations[d]}</option>)}
              </select>
            )}
          </Field>
        ) : (
          <p className={styles.muted}>{t.overrideDenied}</p>
        )}
      </div>
      <p className={styles.muted}>{`${t.template}: ${t.templates[template.id] ?? template.id}`}</p>

      <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
        {attempted && missing.length ? <InlineAlert tone="error" title={t.missing(missing.length)} /> : null}
        {template.fields.map((f) => {
          const label = t.fields[f.key] ?? f.key;
          const error = attempted && missing.includes(f.key) ? t.required(label) : undefined;
          const filledFromCase = Boolean(f.mergeFrom && prefill(template, c)[f.key]);
          return (
            <Field
              key={f.key}
              id={`esc-${f.key}`}
              label={label}
              required={f.required}
              error={error}
              {...(filledFromCase ? { hint: t.prefilled } : {})}
            >
              {(p) =>
                f.kind === 'textarea' ? (
                  <textarea {...p} value={fields[f.key] ?? ''} onChange={(e) => { setFields((s) => ({ ...s, [f.key]: e.target.value })); }} />
                ) : f.kind === 'select' ? (
                  <select {...p} value={fields[f.key] ?? ''} onChange={(e) => { setFields((s) => ({ ...s, [f.key]: e.target.value })); }}>
                    <option value="">{strings.workspace.form.chooseOption}</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{t.options[o] ?? o}</option>)}
                  </select>
                ) : (
                  <input
                    {...p}
                    type={f.kind === 'date' ? 'date' : 'text'}
                    autoComplete="off"
                    value={fields[f.key] ?? ''}
                    onChange={(e) => { setFields((s) => ({ ...s, [f.key]: e.target.value })); }}
                  />
                )
              }
            </Field>
          );
        })}

        <fieldset className={styles.checks}>
          <legend className={styles.label}>{t.attachments}</legend>
          <p className={styles.muted}>{t.attachmentsHint}</p>
          {t.attachmentOptions.map((a) => (
            <label key={a} className={styles.check}>
              <input
                type="checkbox"
                checked={attachments.includes(a)}
                onChange={(e) => { setAttachments((s) => (e.target.checked ? [...s, a] : s.filter((x) => x !== a))); }}
              />
              {a}
            </label>
          ))}
        </fieldset>

        {failure ? (
          <InlineAlert tone="error" title={t.failed(dest)}>
            {failure.correlationId ? (
              <p>{strings.pages.interaction.correlation}: <span className="mono">{failure.correlationId}</span></p>
            ) : null}
          </InlineAlert>
        ) : null}

        <div className={styles.actions}>
          <Button type="submit" variant="primary" isDisabled={sending}>
            {sending ? t.sending : failure ? t.retry : t.send(dest)}
          </Button>
          <Button onPress={onCancel} isDisabled={sending}>{t.cancel}</Button>
        </div>
      </form>
    </section>
  );
}
