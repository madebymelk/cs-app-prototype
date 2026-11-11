import { useState } from 'react';
import { Button } from '@/components/Button/Button';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { reasonLabel } from '@/components/InteractionHeader/InteractionHeader';
import { Facts } from '@/components/ReadOnlyBlock/ReadOnlyBlock';
import { CaseStatusBadge } from '@/components/StatusBadge/StatusBadge';
import { formatDateTime } from '@/content/format';
import { strings } from '@/content/strings';
import type { CopySelection } from '@/domain/priorCopy';
import type { Case } from '@/domain/types';
import { announce } from '@/components/LiveAnnouncer/announce';
import styles from './context.module.css';

const t = strings.context.prior;
const f = strings.workspace.form;
const OPTIONS = ['notes', 'finalReason', 'nextSteps', 'linked'] as const;

/** Prior case, read-only, with selective copy into the active case (F6). Never edits the prior case. */
export function PriorCaseView({
  prior,
  activeCase,
  onCopy,
}: {
  prior: Case;
  activeCase?: Case | undefined;
  onCopy?: ((prior: Case, selection: CopySelection) => number) | undefined;
}) {
  const [selection, setSelection] = useState<CopySelection>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const canCopy = onCopy && activeCase && !['closed', 'discarded', 'canceled'].includes(activeCase.status);

  return (
    <div className={styles.stack}>
      <p className={styles.muted}>{t.readOnly}</p>
      <Facts
        items={[
          [f.finalReason, reasonLabel(prior.finalReason) ?? '—'],
          [strings.context.records.columns.status, <CaseStatusBadge key="s" status={prior.status} />],
          [strings.context.records.columns.created, formatDateTime(prior.createdAt)],
          [strings.workspace.closeout.disposition, prior.disposition ? (strings.dispositions as Record<string, string>)[prior.disposition] ?? prior.disposition : '—'],
        ]}
      />
      <div>
        <h5 className={styles.h5}>{f.notes}</h5>
        <p className={styles.prose}>{prior.notes || '—'}</p>
      </div>
      {prior.nextSteps ? (
        <div>
          <h5 className={styles.h5}>{strings.workspace.closeout.nextSteps}</h5>
          <p className={styles.prose}>{prior.nextSteps}</p>
        </div>
      ) : null}

      {canCopy ? (
        <fieldset className={styles.copy}>
          <legend className={styles.h5}>{t.copyTitle}</legend>
          {OPTIONS.map((o) => (
            <label key={o} className={styles.check}>
              <input
                type="checkbox"
                checked={Boolean(selection[o])}
                onChange={(e) => { setSelection((s) => ({ ...s, [o]: e.target.checked })); }}
              />
              {t.copyOptions[o]}
            </label>
          ))}
          <div>
            <Button
              compact
              variant="primary"
              onPress={() => {
                const n = onCopy(prior, selection);
                const text = n ? t.copied(n, activeCase.id) : t.nothing;
                setResult({ ok: n > 0, text });
                announce(text);
                if (n) setSelection({});
              }}
            >
              {t.copy}
            </Button>
          </div>
          {result ? <InlineAlert tone={result.ok ? 'success' : 'warning'} title={result.text} /> : null}
        </fieldset>
      ) : onCopy ? (
        <p className={styles.muted}>{t.noActive}</p>
      ) : null}
    </div>
  );
}
