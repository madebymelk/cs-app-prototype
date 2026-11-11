import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { caseAdapter } from '@/api/caseAdapter';
import { ApiError } from '@/api/client';
import { useSession } from '@/app/sessionStore';
import { usePermission } from '@/app/usePermission';
import { Button } from '@/components/Button/Button';
import { ContextChips } from '@/components/ContextChips/ContextChips';
import { CopyButton } from '@/components/CopyButton/CopyButton';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { reasonLabel } from '@/components/InteractionHeader/InteractionHeader';
import { Facts } from '@/components/ReadOnlyBlock/ReadOnlyBlock';
import { CaseStatusBadge, DownstreamBadge } from '@/components/StatusBadge/StatusBadge';
import { formatDateTime } from '@/content/format';
import { strings } from '@/content/strings';
import { transition } from '@/domain/caseMachine';
import { permissionsFor } from '@/domain/permissions';
import type { CaseSummary } from '@/domain/types';
import { announce } from '@/components/LiveAnnouncer/announce';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import styles from './cases.module.css';

const t = strings.caseDetail;
const e = strings.escalation;

/** Case detail, history and audit (F6). Read-only except reopen for permitted roles. */
export function CaseDetailPage() {
  const { id = '' } = useParams();
  const client = useQueryClient();
  const canReopen = usePermission('canReopen');
  const { userId, roleId } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['case', id], queryFn: ({ signal }) => caseAdapter.get(id, signal), retry: false });

  if (query.isPending) return <div className={styles.page} aria-busy="true"><div className={styles.skeleton} /></div>;
  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{strings.pages.caseDetail.title(id)}</h1>
        <InlineAlert tone={notFound ? 'info' : 'error'} title={notFound ? t.notFound(id) : t.loadError}>
          <p><Link to="/cases">{t.back}</Link></p>
        </InlineAlert>
      </div>
    );
  }
  const c: CaseSummary = query.data;
  const actor = (a: string) => c.actorNames?.[a] ?? a;
  const events = [...c.audit].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const reopen = async () => {
    const r = transition(c, { type: 'reopen' }, { actorId: userId, permissions: permissionsFor(roleId) });
    if (!r.ok) return;
    await caseAdapter.save(r.value);
    await client.invalidateQueries({ queryKey: ['case', id] });
    const text = t.reopened(c.id);
    setMessage(text);
    announce(text);
  };

  return (
    <div className={styles.page}>
      <p><Link to="/cases">{t.back}</Link></p>
      <div className={styles.headRow}>
        <h1 className={styles.title}>
          {strings.pages.caseDetail.title('')}<span className="mono">{c.id}</span>
        </h1>
        <CopyButton value={c.id} label={strings.workspace.form.caseId} />
        <CaseStatusBadge status={c.status} />
        {c.status === 'closed' ? (
          canReopen ? (
            <Button compact onPress={() => void reopen()}>{t.reopen}</Button>
          ) : (
            <span className={styles.muted}>{t.reopenDenied}</span>
          )
        ) : null}
      </div>
      {message ? <InlineAlert tone="success" title={message} /> : null}

      <section className={styles.card} aria-labelledby="cd-summary">
        <h2 id="cd-summary" className={styles.h2}>{t.summary}</h2>
        <Facts
          items={[
            [t.owner, c.ownerName],
            [t.created, formatDateTime(c.createdAt)],
            [t.updated, formatDateTime(c.updatedAt)],
            [t.interaction, <span key="i" className="mono">{c.interactionId}</span>],
            [t.channel, c.channel ? strings.pages.interaction.channels[c.channel] : '—'],
            [t.caller, `${c.callerName ?? c.callerFirstName ?? '—'} (${strings.callerTypes[c.callerType]})`],
            [t.reason, reasonLabel(c.finalReason) ?? '—'],
            [t.workgroup, c.workgroup ? (strings.workgroups[c.workgroup.id] ?? c.workgroup.id) : '—'],
            [t.disposition, c.disposition ? ((strings.dispositions as Record<string, string>)[c.disposition] ?? c.disposition) : '—'],
            [t.repeatContact, c.repeatContact === undefined ? '—' : c.repeatContact ? strings.workspace.form.yes : strings.workspace.form.no],
            [t.vamc, c.vamc ?? '—'],
          ]}
        />
      </section>

      <div className={styles.columns}>
        <section className={styles.card} aria-labelledby="cd-notes">
          <h2 id="cd-notes" className={styles.h2}>{t.notes}</h2>
          <p className={styles.prose}>{c.notes || '—'}</p>
          {c.nextSteps ? (
            <>
              <h3 className={styles.h3}>{t.nextSteps}</h3>
              <p className={styles.prose}>{c.nextSteps}</p>
            </>
          ) : null}
        </section>
        <section className={styles.card} aria-labelledby="cd-linked">
          <h2 id="cd-linked" className={styles.h2}>{t.linked}</h2>
          <ContextChips linked={c.linked} />
          <p className={styles.muted}>{t.readOnly}</p>
        </section>
      </div>

      <section className={styles.card} aria-labelledby="cd-downstream">
        <h2 id="cd-downstream" className={styles.h2}>{t.downstream}</h2>
        {c.escalations.length + c.workflows.length === 0 ? <p className={styles.muted}>{t.noDownstream}</p> : null}
        <ul className={styles.list}>
          {c.escalations.map((x) => {
            const info = e.statuses[x.status] ?? { label: x.status, meaning: '', next: '' };
            return (
              <li key={x.id} className={styles.listItem}>
                <strong>{e.destinations[x.destination] ?? x.destination}</strong>
                {x.externalId ? <span className="mono">{x.externalId}</span> : null}
                <DownstreamBadge status={x.status} label={info.label} />
                <span className={styles.muted}>{info.meaning}</span>
                {x.owner ? <span className={styles.muted}>{`${e.owner}: ${x.owner}`}</span> : null}
              </li>
            );
          })}
          {c.workflows.map((w) => {
            const info = strings.workflow.statuses[w.status] ?? { label: w.status, meaning: '', next: '' };
            return (
              <li key={w.id} className={styles.listItem}>
                <strong>{w.name}</strong>
                <span className="mono">{w.id}</span>
                <DownstreamBadge status={w.status} label={info.label} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.card} aria-labelledby="cd-corr">
        <h2 id="cd-corr" className={styles.h2}>{t.correspondence}</h2>
        {c.correspondence.length === 0 ? <p className={styles.muted}>{t.noCorrespondence}</p> : (
          <ul className={styles.list}>
            {c.correspondence.map((x) => (
              <li key={x.id} className={styles.listItem}>
                <strong>{strings.correspondence.templates[x.templateId]?.name ?? x.templateId}</strong>
                <DownstreamBadge status={x.status === 'delivered' ? 'resolved' : x.status === 'failed' ? 'failed' : 'submitting'} label={strings.correspondence.statuses[x.status] ?? x.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.card} aria-labelledby="cd-history">
        <h2 id="cd-history" className={styles.h2}>{t.history}</h2>
        <Tabs>
          <TabList aria-label={t.history} className={styles.tabList}>
            <Tab id="timeline" className={styles.tab}>{t.timeline}</Tab>
            <Tab id="audit" className={styles.tab}>{t.audit}</Tab>
          </TabList>
          <TabPanel id="timeline">
            <ol className={styles.timeline}>
              {events.map((ev, i) => (
                <li key={`${ev.at}-${String(i)}`}>
                  <time dateTime={ev.at}>{formatDateTime(ev.at)}</time>
                  <span><strong>{strings.auditActions[ev.action] ?? ev.action}</strong>{` · ${actor(ev.actorId)}`}</span>
                </li>
              ))}
            </ol>
          </TabPanel>
          <TabPanel id="audit">
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className="visually-hidden">{t.auditCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col" aria-sort="descending">{t.auditColumns.at}</th>
                    <th scope="col">{t.auditColumns.actor}</th>
                    <th scope="col">{t.auditColumns.action}</th>
                    <th scope="col">{t.auditColumns.fields}</th>
                    <th scope="col">{t.auditColumns.refs}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => (
                    <tr key={`${ev.at}-${String(i)}`}>
                      <td>{formatDateTime(ev.at)}</td>
                      <td className="mono">{ev.actorId}</td>
                      <td className="mono">{ev.action}</td>
                      <td>{ev.changedFields?.join(', ') ?? '—'}</td>
                      <td className="mono">{ev.refIds?.join(', ') ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabPanel>
        </Tabs>
      </section>
    </div>
  );
}
