import { DISPOSITIONS } from '@/config/closeout';
import { decisions } from '@/config/decisions';
import { strings } from '@/content/strings';
import { CircleAlert, CircleCheck } from '@/design/icons';
import type { CloseIssue } from '@/domain/closeValidation';
import type { Case } from '@/domain/types';
import { errorFor, fieldId, issueMessage } from '@/features/workspace/issues';
import { Button } from '../Button/Button';
import { CopyButton } from '../CopyButton/CopyButton';
import { Field } from '../Field/Field';
import { InlineAlert } from '../InlineAlert/InlineAlert';
import styles from './Closeout.module.css';

const t = strings.workspace.closeout;

export interface CloseoutProps {
  c: Case;
  issues: CloseIssue[];
  showSummary: boolean;
  closing?: boolean;
  serverError?: { correlationId?: string } | undefined;
  readOnly?: boolean;
  canAddCase: boolean;
  onChange: (patch: Partial<Case>) => void;
  onClose: () => void;
  onAnotherCase: () => void;
}

/** Region F: completeness, disposition, scripts and IDs to read, close (docs/03 Closeout). */
export function Closeout({
  c,
  issues,
  showSummary,
  closing,
  serverError,
  readOnly,
  canAddCase,
  onChange,
  onClose,
  onAnotherCase,
}: CloseoutProps) {
  const closed = c.status === 'closed';
  const escalationIssues = issues.filter((i) => i.field.startsWith('escalation'));
  return (
    <section className={styles.closeout} aria-labelledby={`${c.id}-closeout`}>
      <h3 id={`${c.id}-closeout`} className={styles.title}>{t.title}</h3>

      {serverError ? (
        <InlineAlert tone="error" title={t.closeFailed}>
          {serverError.correlationId ? (
            <p>
              {strings.pages.interaction.correlation}: <span className="mono">{serverError.correlationId}</span>
            </p>
          ) : null}
        </InlineAlert>
      ) : null}

      {closed ? (
        <InlineAlert tone="success" title={t.closed(c.id)}>
          <p className={styles.idRow}>
            <span className="mono">{c.id}</span>
            <CopyButton value={c.id} label={strings.workspace.form.caseId} />
          </p>
        </InlineAlert>
      ) : (
        <div className={styles.checklist} id={fieldId(c.id, 'escalation')} tabIndex={-1}>
          <h4 className={styles.subTitle}>{t.checklist}</h4>
          {issues.length === 0 ? (
            <p className={styles.ok}>
              <CircleCheck size={20} aria-hidden className={styles.okIcon} /> {t.ready}
            </p>
          ) : (
            <>
              <p className={styles.missing}>
                <CircleAlert size={20} aria-hidden className={styles.missingIcon} /> {t.missing(issues.length)}
              </p>
              {escalationIssues.length ? (
                <ul className={styles.items}>
                  {escalationIssues.map((i) => (
                    <li key={`${i.field}-${i.code}`}>{issueMessage(i)}</li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      )}

      <div className={styles.grid}>
        {decisions.dispositionLevel === 'case' ? (
          <Field
            id={fieldId(c.id, 'disposition')}
            label={t.disposition}
            required
            error={errorFor(issues, 'disposition', showSummary)}
          >
            {(p) => (
              <select
                {...p}
                value={c.disposition ?? ''}
                disabled={readOnly || closed}
                onChange={(e) => { onChange({ disposition: e.target.value || undefined }); }}
              >
                <option value="">{strings.workspace.form.chooseOption}</option>
                {DISPOSITIONS.map((d) => (
                  <option key={d} value={d}>{strings.dispositions[d]}</option>
                ))}
              </select>
            )}
          </Field>
        ) : null}
        <Field id={fieldId(c.id, 'nextSteps')} label={t.nextSteps} hint={t.nextStepsHint}>
          {(p) => (
            <textarea
              {...p}
              value={c.nextSteps ?? ''}
              disabled={readOnly || closed}
              onChange={(e) => { onChange({ nextSteps: e.target.value }); }}
            />
          )}
        </Field>
      </div>

      <div className={styles.script}>
        <h4 className={styles.subTitle}>{t.readToCaller}</h4>
        <p>{t.script(c.id)}</p>
        <p className={styles.idRow}>
          <span className="mono">{c.id}</span>
          <CopyButton value={c.id} label={strings.workspace.form.caseId} />
        </p>
      </div>

      <div className={styles.actions}>
        {!closed && !readOnly ? (
          <Button variant="primary" onPress={onClose} isDisabled={closing} aria-keyshortcuts="Control+Enter">
            {t.closeCase}
          </Button>
        ) : null}
        {canAddCase ? (
          <Button onPress={onAnotherCase}>{t.anotherCase}</Button>
        ) : null}
      </div>
    </section>
  );
}
