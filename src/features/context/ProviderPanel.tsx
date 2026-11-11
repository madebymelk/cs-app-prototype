import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { providerAdapter } from '@/api/providerAdapter';
import { SOURCE_NAMES } from '@/api/sources';
import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { Facts, ReadOnlyBlock } from '@/components/ReadOnlyBlock/ReadOnlyBlock';
import { SourceSection } from '@/components/SourceSection/SourceSection';
import { NETWORK_SOURCES, PROVIDER_STALE_AFTER_MINUTES } from '@/config/sources';
import { formatRelative } from '@/content/format';
import { strings } from '@/content/strings';
import { Ban, CircleCheck, TriangleAlert } from '@/design/icons';
import { isStale } from '@/domain/freshness';
import { groupByFacility, validateProviderQuery, type ProviderQuery, type ProviderQueryIssue } from '@/domain/providerSearch';
import type { Case, Provider } from '@/domain/types';
import type { ContextNav } from '@/features/workspace/workspaceStore';
import styles from './context.module.css';

const t = strings.context.provider;
const TEXT_FIELDS = ['name', 'npi', 'tin', 'zip', 'specialty', 'placeOfService'] as const;

export interface ProviderPanelProps {
  nav: ContextNav;
  onNav: (nav: Partial<ContextNav>) => void;
  activeCase?: Case | undefined;
  onAssociate?: ((p: Provider) => void) | undefined;
}

/** Provider search and detail (F8). Validation reasons instead of a generic "not found". */
export function ProviderPanel({ nav, onNav, activeCase, onAssociate }: ProviderPanelProps) {
  const [form, setForm] = useState<ProviderQuery>({});
  const [query, setQuery] = useState<ProviderQuery | null>(null);
  const [issues, setIssues] = useState<ProviderQueryIssue[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const key = ['providerSearch', query] as const;
  const results = useQuery({ queryKey: key, queryFn: ({ signal }) => providerAdapter.search(query ?? {}, signal), enabled: query !== null, retry: false });
  const detailId = nav.detail?.kind === 'provider' ? nav.detail.id : undefined;

  if (detailId) {
    return (
      <ProviderDetail
        id={detailId}
        activeCase={activeCase}
        onAssociate={onAssociate}
        onBack={() => { onNav({ detail: undefined }); }}
      />
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateProviderQuery(form);
    setIssues(found);
    if (!found.length) setQuery({ ...form });
  };
  const issueFor = (field: string) => issues.find((i) => i.field === field);
  const terms = query ? (Object.values(query) as (string | undefined)[]).filter((v) => v?.trim()).join(', ') : '';

  return (
    <section className={styles.stack} aria-labelledby="provider-title">
      <h3 id="provider-title" className={styles.h3}>{t.title}</h3>
      <form className={styles.form} onSubmit={submit} noValidate>
        {TEXT_FIELDS.map((f) => {
          const issue = issueFor(f);
          return (
            <Field key={f} id={`provider-${f}`} label={t[f]} error={issue ? t.issues[issue.code] : undefined}>
              {(props) => (
                <input
                  {...props}
                  type="text"
                  autoComplete="off"
                  inputMode={f === 'npi' || f === 'tin' || f === 'zip' ? 'numeric' : undefined}
                  value={form[f] ?? ''}
                  onChange={(ev) => { setForm((s) => ({ ...s, [f]: ev.target.value })); }}
                />
              )}
            </Field>
          );
        })}
        <Field id="provider-networkSource" label={t.networkSource}>
          {(props) => (
            <select {...props} value={form.networkSource ?? ''} onChange={(ev) => { setForm((s) => ({ ...s, networkSource: ev.target.value || undefined })); }}>
              <option value="">{t.anyNetwork}</option>
              {NETWORK_SOURCES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
        </Field>
        {issueFor('query') ? <p className={styles.error} role="alert">{t.issues.empty}</p> : null}
        <div>
          <Button type="submit" variant="primary">{t.search}</Button>
        </div>
      </form>

      {query ? (
        <SourceSection
          source={SOURCE_NAMES.providers}
          query={results}
          queryKey={key}
          isEmpty={(d) => d.providers.length === 0}
          emptyText={`${t.noMatch(terms)} ${t.noMatchHelp}`}
        >
          {(d) => {
            const groups = groupByFacility(d.providers, d.facilities);
            return (
              <div className={styles.stack}>
                <p role="status">{t.results(d.providers.length, groups.length)}</p>
                {d.providers.length > 1 ? <InlineAlert tone="info" title={t.multiple} /> : null}
                <ul className={styles.groups}>
                  {groups.map((g) => {
                    const expanded = open[g.facility.id] ?? true;
                    const inactive = g.facility.status === 'inactive';
                    return (
                      <li key={g.facility.id} className={`${styles.group} ${inactive ? styles.inactive : ''}`}>
                        <button
                          type="button"
                          className={styles.groupHead}
                          aria-expanded={expanded}
                          onClick={() => { setOpen((s) => ({ ...s, [g.facility.id]: !expanded })); }}
                        >
                          <span className={styles.groupName}>{g.facility.name}</span>
                          <span className={styles.muted}>{`${g.facility.city}, ${g.facility.state} · ${t.providersAt(g.providers.length)}`}</span>
                          {inactive ? (
                            <span className={styles.flag}><Ban size={16} aria-hidden /> {t.inactiveFacility}</span>
                          ) : null}
                        </button>
                        {expanded ? (
                          <ul className={styles.providers}>
                            {g.providers.map((pr) => (
                              <li key={pr.id} className={styles.provider}>
                                <button type="button" className={styles.linkButton} onClick={() => { onNav({ detail: { kind: 'provider', id: pr.id } }); }}>
                                  {pr.name}
                                </button>
                                <span className={styles.muted}>{`${pr.specialty} · NPI `}<span className="mono">{pr.npi}</span></span>
                                <span className={styles.flags}>
                                  {pr.status === 'inactive' ? <span className={styles.flag}><Ban size={16} aria-hidden /> {t.inactive}</span> : null}
                                  {!pr.address ? <span className={styles.flag}><TriangleAlert size={16} aria-hidden /> {t.missingAddress}</span> : null}
                                  {isStale(pr.updatedAt, new Date(), PROVIDER_STALE_AFTER_MINUTES) ? (
                                    <span className={styles.flag}><TriangleAlert size={16} aria-hidden /> {t.staleData(formatRelative(pr.updatedAt))}</span>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          }}
        </SourceSection>
      ) : null}
    </section>
  );
}

export function ProviderDetail({
  id,
  activeCase,
  onAssociate,
  onBack,
}: {
  id: string;
  activeCase?: Case | undefined;
  onAssociate?: ((p: Provider) => void) | undefined;
  onBack?: (() => void) | undefined;
}) {
  const key = ['provider', id] as const;
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => providerAdapter.get(id, signal), retry: false });
  const associated = activeCase?.linked.some((l) => l.kind === 'provider' && l.refId === id);
  const workable = activeCase && !['closed', 'discarded', 'canceled'].includes(activeCase.status);

  return (
    <div className={styles.stack}>
      {onBack ? (
        <div>
          <Button compact variant="quiet" onPress={onBack}>{strings.context.back(t.title.toLowerCase())}</Button>
        </div>
      ) : null}
      <SourceSection source={SOURCE_NAMES.providers} query={query} queryKey={key}>
        {({ provider: pr, facility }) => (
          <ReadOnlyBlock title={pr.name} headingLevel={4} source={SOURCE_NAMES.providers} updatedAt={pr.updatedAt}>
            {facility?.status === 'inactive' ? <InlineAlert tone="warning" title={t.inactiveFacility} /> : null}
            {isStale(pr.updatedAt, new Date(), PROVIDER_STALE_AFTER_MINUTES) ? <InlineAlert tone="info" title={t.staleData(formatRelative(pr.updatedAt))} /> : null}
            <Facts
              items={[
                [t.npi, <span key="n" className="mono">{pr.npi}</span>],
                [t.tin, <span key="t" className="mono">{pr.tin}</span>],
                [t.specialty, pr.specialty],
                [t.taxonomy, <span key="x" className="mono">{pr.taxonomy}</span>],
                [t.placeOfService, pr.placeOfService],
                [t.network, pr.networkSource],
                [t.enrollment, t.enrollmentValues[pr.enrollment] ?? pr.enrollment],
                [t.attestation, t.attestationValues[pr.attestation] ?? pr.attestation],
                [strings.context.records.columns.facility, facility ? `${facility.name}${facility.status === 'inactive' ? ` (${t.inactive})` : ''}` : '—'],
                [strings.context.profile.address, pr.address ? `${pr.address.line1}, ${pr.address.city}, ${pr.address.state} ${pr.address.zip}` : t.missingAddress],
              ]}
            />
            {onAssociate ? (
              associated ? (
                <p className={styles.ok}><CircleCheck size={16} aria-hidden /> {t.associated}</p>
              ) : workable ? (
                <div>
                  <Button compact variant="primary" onPress={() => { onAssociate(pr); }}>{t.associate}</Button>
                </div>
              ) : (
                <p className={styles.muted}>{t.noActiveCase}</p>
              )
            ) : null}
          </ReadOnlyBlock>
        )}
      </SourceSection>
    </div>
  );
}
