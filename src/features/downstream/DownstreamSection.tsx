import { useState } from 'react';
import { Button } from '@/components/Button/Button';
import { CopyButton } from '@/components/CopyButton/CopyButton';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { DownstreamBadge } from '@/components/StatusBadge/StatusBadge';
import { formatDateTime, formatRelative } from '@/content/format';
import { WORKFLOW_NAME } from '@/config/templates';
import { strings } from '@/content/strings';
import { isStale } from '@/domain/freshness';
import type { Case, Escalation, WorkflowRef } from '@/domain/types';
import { refreshEscalation, refreshWorkflow, startWorkflow } from '@/features/workspace/downstream';
import { announce } from '@/components/LiveAnnouncer/announce';
import { EscalationShell } from './EscalationShell';
import styles from './downstream.module.css';

const t = strings.escalation;
const w = strings.workflow;

/** Escalations and workflows for the active case (F12, F14, F15). Status by role, not just a link. */
export function DownstreamSection({
  c,
  readOnly,
  escalating,
  onEscalatingChange,
}: {
  c: Case;
  readOnly: boolean;
  escalating: boolean;
  onEscalatingChange: (open: boolean) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState(false);
  const hasItems = c.escalations.length > 0 || c.workflows.length > 0;

  return (
    <section className={styles.section} aria-labelledby={`${c.id}-downstream`}>
      <div className={styles.head}>
        <h3 id={`${c.id}-downstream`} className={styles.title}>{t.section}</h3>
        {!readOnly && !escalating ? (
          <div className={styles.actions}>
            <Button compact onPress={() => { onEscalatingChange(true); }} aria-keyshortcuts="Alt+Shift+E">{t.escalate}</Button>
            <Button
              compact
              isDisabled={busy === 'workflow'}
              onPress={() => {
                setBusy('workflow');
                void startWorkflow(c.id).then((ok) => {
                  setBusy(null);
                  setWorkflowError(!ok);
                  if (ok) announce(w.started(WORKFLOW_NAME));
                });
              }}
            >
              {w.start}
            </Button>
          </div>
        ) : null}
      </div>
      {workflowError ? <InlineAlert tone="error" title={w.startFailed} /> : null}

      {escalating ? (
        <EscalationShell c={c} onDone={() => { onEscalatingChange(false); }} onCancel={() => { onEscalatingChange(false); }} />
      ) : null}

      {!hasItems && !escalating ? <p className={styles.muted}>{t.sectionEmpty}</p> : null}

      <ul className={styles.cards}>
        {c.escalations.map((e) => (
          <li key={e.id}>
            <EscalationCard
              e={e}
              busy={busy === e.id}
              onRefresh={async () => {
                setBusy(e.id);
                await refreshEscalation(c.id, e.id);
                setBusy(null);
              }}
              onRetry={() => { onEscalatingChange(true); }}
              readOnly={readOnly}
            />
          </li>
        ))}
        {c.workflows.map((wf) => (
          <li key={wf.id}>
            <WorkflowCard
              wf={wf}
              busy={busy === wf.id}
              onRefresh={async () => {
                setBusy(wf.id);
                await refreshWorkflow(c.id, wf.id);
                setBusy(null);
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EscalationCard({
  e,
  busy,
  onRefresh,
  onRetry,
  readOnly,
}: {
  e: Escalation;
  busy: boolean;
  onRefresh: () => Promise<void>;
  onRetry: () => void;
  readOnly: boolean;
}) {
  const dest = t.destinations[e.destination] ?? e.destination;
  const info = t.statuses[e.status] ?? { label: e.status, meaning: '', next: '' };
  const behind = isStale(e.lastSyncedAt, new Date(), 30);
  return (
    <article className={styles.card} aria-label={`${dest} ${e.externalId ?? ''}`}>
      <div className={styles.cardHead}>
        <strong>{dest}</strong>
        <DownstreamBadge status={e.status} label={info.label} />
      </div>
      {e.externalId ? (
        <p className={styles.idRow}>
          <span className={styles.muted}>{t.ticket}</span>
          <span className="mono">{e.externalId}</span>
          <CopyButton value={e.externalId} label={t.ticket} />
        </p>
      ) : null}
      <p>{info.meaning}</p>
      <dl className={styles.facts}>
        <dt>{t.template}</dt>
        <dd>{t.templates[e.templateId] ?? e.templateId}</dd>
        {e.owner ? (<><dt>{t.owner}</dt><dd>{e.owner}</dd></>) : null}
        <dt>{t.next}</dt>
        <dd>{info.next}</dd>
      </dl>
      {e.status === 'failed' ? (
        <InlineAlert tone="error" title={t.failed(dest)}>
          {e.error?.correlationId ? <p>{strings.pages.interaction.correlation}: <span className="mono">{e.error.correlationId}</span></p> : null}
          {!readOnly ? <Button compact onPress={onRetry}>{t.retry}</Button> : null}
        </InlineAlert>
      ) : null}
      {e.lastSyncedAt ? (
        behind ? (
          <InlineAlert tone="warning" title={t.syncBehind(formatRelative(e.lastSyncedAt))} />
        ) : (
          <p className={styles.muted}>
            <time dateTime={e.lastSyncedAt} title={formatDateTime(e.lastSyncedAt)}>{t.lastSynced(formatRelative(e.lastSyncedAt))}</time>
          </p>
        )
      ) : null}
      {e.externalId ? (
        <div>
          <Button compact variant="quiet" isDisabled={busy} onPress={() => void onRefresh()}>{t.refresh}</Button>
        </div>
      ) : null}
    </article>
  );
}

function WorkflowCard({ wf, busy, onRefresh }: { wf: WorkflowRef; busy: boolean; onRefresh: () => Promise<void> }) {
  const info = w.statuses[wf.status] ?? { label: wf.status, meaning: '', next: '' };
  return (
    <article className={styles.card} aria-label={`${wf.name} ${wf.id}`}>
      <div className={styles.cardHead}>
        <strong>{wf.name}</strong>
        <DownstreamBadge status={wf.status} label={info.label} />
      </div>
      <p className={styles.idRow}><span className="mono">{wf.id}</span></p>
      <p>{info.meaning}</p>
      <dl className={styles.facts}>
        {wf.owner ? (<><dt>{t.owner}</dt><dd>{wf.owner}</dd></>) : null}
        <dt>{t.next}</dt>
        <dd>{info.next}</dd>
      </dl>
      {wf.status === 'blocked' && wf.blockedReason ? (
        <InlineAlert tone="error" title={`${w.blockedReason}: ${wf.blockedReason}`} />
      ) : null}
      <p className={styles.muted}>
        <time dateTime={wf.updatedAt} title={formatDateTime(wf.updatedAt)}>{t.lastSynced(formatRelative(wf.updatedAt))}</time>
      </p>
      <div>
        <Button compact variant="quiet" isDisabled={busy} onPress={() => void onRefresh()}>
          {wf.status === 'blocked' ? w.retry : w.refresh}
        </Button>
      </div>
    </article>
  );
}
