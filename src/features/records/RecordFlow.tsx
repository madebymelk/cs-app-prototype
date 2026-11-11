import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/api/client';
import { eligibilityRecordAdapter } from '@/api/eligibilityRecordAdapter';
import { providerAdapter } from '@/api/providerAdapter';
import { veteranAdapter } from '@/api/veteranAdapter';
import { Button } from '@/components/Button/Button';
import { CopyButton } from '@/components/CopyButton/CopyButton';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { announce } from '@/components/LiveAnnouncer/announce';
import { Facts } from '@/components/ReadOnlyBlock/ReadOnlyBlock';
import { StepFlow } from '@/components/StepFlow/StepFlow';
import { formatDate } from '@/content/format';
import { strings } from '@/content/strings';
import { CircleAlert, CircleCheck } from '@/design/icons';
import { eligibilityFor } from '@/domain/eligibility';
import { evaluateControls, failedControls, type RecordKind } from '@/domain/eligibilityRecord';
import type { ProviderQuery } from '@/domain/providerSearch';
import type { Case, EligibilityRecord, Facility, Provider } from '@/domain/types';
import { EligibilityStatusText } from '@/features/context/VeteranProfile';
import { attachEligibilityRecord } from '@/features/workspace/downstream';
import styles from './records.module.css';

const t = strings.records;
const SEARCH_SPECIALTY: Record<RecordKind, string> = { ucern: 'Urgent care', vpern: 'Pharmacy' };

/** UCERN / VPERN guided flow (F13). Lives inside the active case; never outside one. */
export function RecordFlow({ kind, c, veteranId, onClose }: { kind: RecordKind; c: Case; veteranId?: string | undefined; onClose: () => void }) {
  const name = t.names[kind] ?? kind;
  const [step, setStep] = useState(0);
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState<ProviderQuery>({ specialty: SEARCH_SPECIALTY[kind] });
  const [selected, setSelected] = useState<{ provider: Provider; facility?: Facility } | undefined>(undefined);
  const [dos, setDos] = useState(() => new Date().toISOString().slice(0, 10));
  const [idempotencyKey] = useState(() => `${c.id}-${kind}-${String(Date.now())}`);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<{ correlationId?: string } | null>(null);
  const [record, setRecord] = useState<EligibilityRecord | null>(null);

  const veteran = useQuery({ queryKey: ['veteran', veteranId], queryFn: ({ signal }) => veteranAdapter.get(veteranId ?? '', signal), enabled: Boolean(veteranId), retry: false });
  const eligibility = useQuery({ queryKey: ['eligibility', veteranId], queryFn: ({ signal }) => veteranAdapter.eligibility(veteranId ?? '', signal), enabled: Boolean(veteranId), retry: false });
  const providers = useQuery({ queryKey: ['recordProviders', query], queryFn: ({ signal }) => providerAdapter.search(query, signal), enabled: step === 1, retry: false });

  const eligibilityType = kind === 'ucern' ? 'urgentCare' : 'pharmacy';
  const eligibilityStatus = eligibility.data
    ? eligibilityFor({ status: 'ok', data: eligibility.data.items, source: eligibility.data.source }, eligibilityType)
    : eligibility.isError ? 'unavailable' : undefined;
  const results = evaluateControls({ kind, eligibility: eligibilityStatus, provider: selected?.provider, facility: selected?.facility, dateOfService: dos }, new Date());
  const failed = failedControls(results);
  const veteranName = veteran.data ? `${veteran.data.firstName} ${veteran.data.lastName}` : '—';

  const create = async () => {
    if (!selected || !veteranId) return;
    setCreating(true);
    setError(null);
    try {
      const r = await eligibilityRecordAdapter.create({
        idempotencyKey, kind, veteranId, providerId: selected.provider.id, facilityName: selected.facility?.name ?? selected.provider.name, dateOfService: dos, caseId: c.id,
      });
      await attachEligibilityRecord(c.id, r);
      setRecord(r);
      setStep(4);
      announce(t.created(name, r.number));
    } catch (e) {
      setError(e instanceof ApiError && e.correlationId ? { correlationId: e.correlationId } : {});
    } finally {
      setCreating(false);
    }
  };

  const nav = (canContinue: boolean, why?: string) => (
    <div className={styles.actions}>
      {step > 0 ? <Button onPress={() => { setStep((s) => s - 1); }}>{t.back}</Button> : null}
      <Button variant="primary" isDisabled={!canContinue} onPress={() => { setStep((s) => s + 1); }}>{t.next}</Button>
      <Button variant="quiet" onPress={onClose}>{t.cancel}</Button>
      {!canContinue && why ? <p className={styles.muted}>{why}</p> : null}
    </div>
  );

  return (
    <StepFlow title={t.titles[kind] ?? name} steps={t.steps} current={step} intro={t.intro[kind]}>
      {step === 0 ? (
        <>
          {!veteranId ? (
            <InlineAlert tone="warning" title={t.noVeteran} />
          ) : (
            <>
              <Facts items={[[t.fields.veteran, veteranName], [t.eligibilityType[kind] ?? '', eligibilityStatus ? <EligibilityStatusText key="e" status={eligibilityStatus} /> : '…']]} />
              {eligibilityStatus && eligibilityStatus !== 'eligible' ? <InlineAlert tone="warning" title={t.notEligible} /> : null}
            </>
          )}
          {nav(Boolean(veteranId) && eligibilityStatus !== undefined, veteranId ? undefined : t.noVeteran)}
        </>
      ) : null}

      {step === 1 ? (
        <>
          <form
            className={styles.search}
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              setQuery(term.trim() ? { name: term.trim() } : { specialty: SEARCH_SPECIALTY[kind] });
            }}
          >
            <Field id="record-provider-term" label={t.providerName}>
              {(p) => <input {...p} type="text" autoComplete="off" value={term} onChange={(e) => { setTerm(e.target.value); }} />}
            </Field>
            <Button type="submit">{t.search}</Button>
          </form>
          <fieldset className={styles.choices}>
            <legend className={styles.legend}>{t.chooseProvider}</legend>
            {providers.isPending ? <p className={styles.muted}>{strings.source.loading('Provider directory')}</p> : null}
            {providers.isError ? <InlineAlert tone="warning" title={strings.source.down('Provider directory')} /> : null}
            {providers.data?.providers.length === 0 ? <p className={styles.muted}>{t.noProviders}</p> : null}
            {providers.data?.providers.map((pr) => {
              const fac = providers.data.facilities.find((f) => f.id === pr.facilityId);
              return (
                <label key={pr.id} className={styles.choice}>
                  <input
                    type="radio"
                    name="record-provider"
                    checked={selected?.provider.id === pr.id}
                    onChange={() => { setSelected(fac ? { provider: pr, facility: fac } : { provider: pr }); }}
                  />
                  <span className={styles.choiceText}>
                    <strong>{pr.name}</strong>
                    <span className={styles.muted}>{`${pr.placeOfService} · ${pr.networkSource} · ${fac ? `${fac.city}, ${fac.state}` : ''}`}</span>
                    {pr.status === 'inactive' || fac?.status === 'inactive' ? (
                      <span className={styles.flag}><CircleAlert size={14} aria-hidden /> {strings.context.provider.inactive}</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </fieldset>
          {nav(Boolean(selected))}
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Field id="record-dos" label={t.dateOfService} hint={t.dateOfServiceHint} required>
            {(p) => <input {...p} type="date" value={dos} onChange={(e) => { setDos(e.target.value); }} />}
          </Field>
          <p className={styles.muted}>{t.controlsIntro}</p>
          {failed.length ? <InlineAlert tone="error" title={t.blocked(failed.length)} /> : null}
          <ul className={styles.controls} aria-label={t.controlsTitle}>
            {results.map((r) => {
              const info = t.controls[r.id] ?? { name: r.id, recovery: '' };
              return (
                <li key={r.id} className={`${styles.control} ${r.passed ? '' : styles.controlFailed}`}>
                  {r.passed ? <CircleCheck size={20} aria-hidden className={styles.ok} /> : <CircleAlert size={20} aria-hidden className={styles.bad} />}
                  <span>
                    <strong>{info.name}</strong>
                    {': '}
                    {r.passed ? t.passed : t.failed}
                    {!r.passed ? <span className={styles.recovery}>{info.recovery}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
          {nav(failed.length === 0)}
        </>
      ) : null}

      {step === 3 && selected ? (
        <>
          <h5 className={styles.legend}>{t.review}</h5>
          <Facts
            items={[
              [t.fields.veteran, veteranName],
              [t.fields.provider, selected.provider.name],
              [t.fields.facility, selected.facility?.name ?? '—'],
              [t.network, selected.provider.networkSource],
              [t.dateOfService, formatDate(dos)],
            ]}
          />
          {error ? (
            <InlineAlert tone="error" title={t.createFailed(name)}>
              {error.correlationId ? <p>{strings.pages.interaction.correlation}: <span className="mono">{error.correlationId}</span></p> : null}
            </InlineAlert>
          ) : null}
          <div className={styles.actions}>
            <Button onPress={() => { setStep(2); }} isDisabled={creating}>{t.back}</Button>
            <Button variant="primary" isDisabled={creating} onPress={() => void create()}>
              {creating ? t.creating : error ? t.retry : t.create(name)}
            </Button>
            <Button variant="quiet" onPress={onClose} isDisabled={creating}>{t.cancel}</Button>
          </div>
        </>
      ) : null}

      {step === 4 && record && selected ? (
        <>
          <InlineAlert tone="success" title={t.created(name, record.number)} />
          <p className={styles.idRow}>
            <span className={styles.muted}>{t.recordNumber}</span>
            <span className="mono">{record.number}</span>
            <CopyButton value={record.number} label={t.recordNumber} />
          </p>
          <div className={styles.script}>
            <h5 className={styles.legend}>{t.disclosure}</h5>
            {(() => {
              const script = t.disclosureScript[kind](record.number, selected.facility?.name ?? selected.provider.name, formatDate(dos));
              return (
                <>
                  <p>{script}</p>
                  <CopyButton value={script} label={t.disclosure} />
                </>
              );
            })()}
          </div>
          <div className={styles.actions}>
            <Button variant="primary" onPress={onClose}>{t.done}</Button>
          </div>
        </>
      ) : null}
    </StepFlow>
  );
}
