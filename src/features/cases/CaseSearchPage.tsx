import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { caseAdapter, type CaseSearchQuery } from '@/api/caseAdapter';
import { ApiError } from '@/api/client';
import { usePrefs } from '@/app/prefsStore';
import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { reasonLabel } from '@/components/InteractionHeader/InteractionHeader';
import { CaseStatusBadge } from '@/components/StatusBadge/StatusBadge';
import { CALL_REASONS, CASE_TYPES, WORKGROUPS } from '@/config/caseTypes';
import { DISPOSITIONS } from '@/config/closeout';
import { formatDateTime } from '@/content/format';
import { strings } from '@/content/strings';
import type { CaseStatus } from '@/domain/types';
import { useSession } from '@/app/sessionStore';
import styles from './cases.module.css';

const t = strings.caseSearch;
const STATUSES: CaseStatus[] = ['draft', 'open', 'pendingDownstream', 'readyToClose', 'closed', 'reopened', 'canceled'];
const VAMCS = ['Tucson VAMC', 'Dayton VAMC', 'Asheville VAMC', 'Boise VAMC'];
const AGENT_OPTIONS = [
  ['AGT-11873', 'Priya Lindqvist'],
  ['AGT-30552', 'Marcus Holloway'],
  ['AGT-41209', 'Dana Sandoval'],
  ['AGT-52630', 'Rafael Quintero'],
] as const;

/** Case search (F6): replaces off-system spreadsheets. Filters, page and sort persist. */
export function CaseSearchPage() {
  const [params, setParams] = useSearchParams();
  const userId = useSession((s) => s.userId);
  const saved = usePrefs((s) => s.caseSearch);
  const setSaved = usePrefs((s) => s.setCaseSearch);
  const [form, setForm] = useState<CaseSearchQuery>(saved.query);
  const applied = saved.query;

  // Global search (header) hands its text over as ?q=
  useEffect(() => {
    const q = params.get('q');
    if (q !== null) {
      const next = { q, page: 1 };
      setForm(next);
      setSaved({ query: next });
      setParams({}, { replace: true });
    }
  }, [params, setParams, setSaved]);

  const results = useQuery({
    queryKey: ['caseSearch', applied],
    queryFn: ({ signal }) => caseAdapter.search(applied, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSaved({ query: { ...form, page: 1 } });
  };
  const set = (k: keyof CaseSearchQuery) => (v: string) => { setForm((f) => ({ ...f, [k]: v || undefined })); };
  const page = applied.page ?? 1;
  const data = results.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const select = (k: keyof CaseSearchQuery, label: string, options: readonly (readonly [string, string])[], anyLabel: string = t.any) => (
    <Field id={`cs-${k}`} label={label}>
      {(p) => (
        <select {...p} value={(form[k]) ?? ''} onChange={(e) => { set(k)(e.target.value); }}>
          <option value="">{anyLabel}</option>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
    </Field>
  );
  const text = (k: keyof CaseSearchQuery, label: string, type: 'text' | 'date' = 'text', hint?: string) => (
    <Field id={`cs-${k}`} label={label} {...(hint ? { hint } : {})}>
      {(p) => <input {...p} type={type} autoComplete="off" value={(form[k]) ?? ''} onChange={(e) => { set(k)(e.target.value); }} />}
    </Field>
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.muted}>{t.intro}</p>

      <form className={styles.form} onSubmit={submit} role="search" aria-label={t.title}>
        <div className={styles.grid}>
          {text('q', t.q)}
          {text('from', t.from, 'date')}
          {text('to', t.to, 'date')}
          {select('status', t.status, [['notClosed', t.notClosed], ...STATUSES.map((s) => [s, strings.caseStatus[s]] as const)], t.anyStatus)}
          {select('owner', t.owner, [[userId, t.me], ...AGENT_OPTIONS], t.anyAgent)}
        </div>
        <button
          type="button"
          className={styles.disclosure}
          aria-expanded={saved.expanded}
          aria-controls="cs-more"
          onClick={() => { setSaved({ expanded: !saved.expanded }); }}
        >
          {saved.expanded ? t.fewer : t.more}
        </button>
        <div id="cs-more" className={styles.grid} hidden={!saved.expanded}>
          {text('caseId', t.caseId)}
          {text('veteranId', t.veteranId)}
          {text('providerId', t.providerId)}
          {select('vamc', t.vamc, VAMCS.map((v) => [v, v] as const), t.anyVamc)}
          {select('caseType', t.caseType, CASE_TYPES.map((c) => [c, t.caseTypes[c] ?? c] as const))}
          {select('reason', t.reason, CALL_REASONS.map((r) => [r, strings.callReasons[r]] as const))}
          {select('disposition', t.disposition, DISPOSITIONS.map((d) => [d, strings.dispositions[d]] as const))}
          {select('workgroup', t.workgroup, WORKGROUPS.map((w) => [w, strings.workgroups[w] ?? w] as const))}
          {select('channel', t.channel, [['voice', strings.pages.interaction.channels.voice], ['chat', strings.pages.interaction.channels.chat]])}
        </div>
        <div className={styles.actions}>
          <Button type="submit" variant="primary">{t.search}</Button>
          <Button
            onPress={() => {
              setForm({});
              setSaved({ query: {} });
            }}
          >
            {t.clear}
          </Button>
        </div>
      </form>

      <section aria-labelledby="cs-results" className={styles.results} aria-busy={results.isFetching}>
        <h2 id="cs-results" className={styles.h2}>
          {data ? t.results(data.total) : t.loading}
        </h2>
        {results.isError ? (
          <InlineAlert tone="error" title={t.error}>
            {results.error instanceof ApiError && results.error.correlationId ? (
              <p>{strings.pages.interaction.correlation}: <span className="mono">{results.error.correlationId}</span></p>
            ) : null}
            <Button compact onPress={() => void results.refetch()}>{strings.source.retry}</Button>
          </InlineAlert>
        ) : null}
        {data?.partial ? <InlineAlert tone="warning" title={t.partial(data.partial)} /> : null}
        {data?.tooMany ? <InlineAlert tone="info" title={t.tooMany} /> : null}
        {data && data.total === 0 ? (
          <div className={styles.empty}>
            <p><strong>{t.noMatch}</strong></p>
            <p className={styles.muted}>{t.noMatchHelp}</p>
          </div>
        ) : null}
        {!data && results.isPending ? <div className={styles.skeleton} aria-label={t.loading} /> : null}
        {data && data.total > 0 ? (
          <>
            <p className={styles.muted} role="status">
              {t.showing((page - 1) * data.pageSize + 1, Math.min(page * data.pageSize, data.total), data.total)}
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className="visually-hidden">{t.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.columns.id}</th>
                    <th scope="col" aria-sort="descending">{t.columns.created}</th>
                    <th scope="col">{t.columns.caller}</th>
                    <th scope="col">{t.columns.reason}</th>
                    <th scope="col">{t.columns.status}</th>
                    <th scope="col">{t.columns.owner}</th>
                    <th scope="col">{t.columns.workgroup}</th>
                    <th scope="col">{t.columns.channel}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.id}>
                      <td><Link to={`/cases/${c.id}`} className="mono">{c.id}</Link></td>
                      <td>{formatDateTime(c.createdAt)}</td>
                      <td>{c.callerName ?? <span className={styles.muted}>{t.callerUnavailable}</span>}</td>
                      <td>{reasonLabel(c.finalReason) ?? '—'}</td>
                      <td><CaseStatusBadge status={c.status} /></td>
                      <td>{c.ownerName}</td>
                      <td>{c.workgroup ? (strings.workgroups[c.workgroup.id] ?? c.workgroup.id) : '—'}</td>
                      <td>{c.channel ? strings.pages.interaction.channels[c.channel] : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 ? (
              <nav className={styles.pager} aria-label={t.page(page, pages)}>
                <Button compact isDisabled={page <= 1} onPress={() => { setSaved({ query: { ...applied, page: page - 1 } }); }}>{t.prev}</Button>
                <span>{t.page(page, pages)}</span>
                <Button compact isDisabled={page >= pages} onPress={() => { setSaved({ query: { ...applied, page: page + 1 } }); }}>{t.next}</Button>
              </nav>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
