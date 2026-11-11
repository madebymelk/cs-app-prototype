import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { veteranAdapter, type VeteranQuery } from '@/api/veteranAdapter';
import { SOURCE_NAMES } from '@/api/sources';
import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { MaskedValue } from '@/components/MaskedValue/MaskedValue';
import { SourceSection } from '@/components/SourceSection/SourceSection';
import { formatDate } from '@/content/format';
import { strings } from '@/content/strings';
import type { Veteran } from '@/domain/types';
import styles from './context.module.css';

const t = strings.context.identify;
const FIELDS = ['lastName', 'dob', 'ssnLast4', 'icn', 'memberId'] as const;

/** Find the Veteran by approved identifiers; disambiguate multiple matches (F7). */
export function IdentifyVeteran({ callerName, onSelect }: { callerName?: string | undefined; onSelect: (v: Veteran) => void }) {
  const callerLast = callerName?.split(' ').slice(-1)[0];
  const [form, setForm] = useState<VeteranQuery>(callerLast ? { lastName: callerLast } : {});
  const [query, setQuery] = useState<VeteranQuery | null>(callerLast ? { lastName: callerLast } : null);
  const [empty, setEmpty] = useState(false);
  const key = ['veteranSearch', query] as const;
  const results = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => veteranAdapter.search(query ?? {}, signal),
    enabled: query !== null,
    retry: false,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const filled = FIELDS.some((f) => form[f]?.trim());
    setEmpty(!filled);
    if (filled) setQuery({ ...form });
  };

  return (
    <section className={styles.stack} aria-labelledby="identify-title">
      <h3 id="identify-title" className={styles.h3}>{t.title}</h3>
      <p className={styles.muted}>{t.intro}</p>
      <form className={styles.form} onSubmit={submit} noValidate>
        {FIELDS.map((f) => (
          <Field key={f} id={`identify-${f}`} label={t[f]} {...(f === 'dob' ? { hint: t.dobHint } : {})}>
            {(props) => (
              <input
                {...props}
                type="text"
                autoComplete="off"
                value={form[f] ?? ''}
                onChange={(ev) => { setForm((s) => ({ ...s, [f]: ev.target.value })); }}
              />
            )}
          </Field>
        ))}
        {empty ? <p className={styles.error} role="alert">{t.needOne}</p> : null}
        <div>
          <Button type="submit" variant="primary">{t.search}</Button>
        </div>
      </form>

      {query ? (
        <SourceSection
          source={SOURCE_NAMES.profile}
          query={results}
          queryKey={key}
          isEmpty={(r) => r.length === 0}
          emptyText={`${t.noMatch} ${t.noMatchHelp}`}
        >
          {(list) => (
            <div className={styles.stack}>
              {list.length > 1 ? <InlineAlert tone="warning" title={t.results(list.length)} /> : <p role="status">{t.results(list.length)}</p>}
              <ul className={styles.matches}>
                {list.map((v) => (
                  <li key={v.id} className={styles.match}>
                    <strong>{`${v.firstName} ${v.lastName}`}</strong>
                    <dl className={styles.inlineFacts}>
                      <dt>{strings.context.profile.dob}</dt>
                      <dd>{formatDate(v.dob)}</dd>
                      <dt>{strings.context.profile.ssnLast4}</dt>
                      <dd className="mono">{v.ssnLast4}</dd>
                      <dt>{strings.context.profile.icn}</dt>
                      <dd><MaskedValue value={v.icn} label={strings.context.profile.icn} canReveal={false} onReveal={() => undefined} /></dd>
                    </dl>
                    <Button compact onPress={() => { onSelect(v); }}>{t.select(`${v.firstName} ${v.lastName}`)}</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SourceSection>
      ) : null}
    </section>
  );
}
