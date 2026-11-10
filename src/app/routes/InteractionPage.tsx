import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { getScreenPop } from '@/api/interactionAdapter';
import { CopyButton } from '@/components/CopyButton/CopyButton';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { isCallReason } from '@/config/caseTypes';
import { strings } from '@/content/strings';
import { MessageSquare, Phone } from '@/design/icons';
import styles from './InteractionPage.module.css';

const s = strings.pages.interaction;
const MISSING_LABELS = { callerName: s.caller, initialReason: s.initialReason } as const;

/**
 * Live interaction workspace frame (docs/02 layout B/C/D/E). M0 proves layout, tokens, mocks and
 * scenarios end to end; the real InteractionHeader, CaseNavigator, CaseForm come in M2, context in M3.
 */
export function InteractionPage() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['interaction', id], queryFn: ({ signal }) => getScreenPop(id, signal), retry: false });
  const interaction = query.data?.interaction;
  const missing = query.data?.missing ?? [];
  const ChannelIcon = interaction?.channel === 'chat' ? MessageSquare : Phone;

  return (
    <div className={styles.workspace}>
      <section id="interaction" className={styles.header} aria-labelledby="interaction-title" aria-busy={query.isPending}>
        <h1 id="interaction-title" className={styles.caller}>
          {query.isPending ? s.loading : (interaction?.caller.name ?? s.callerUnknown)}
        </h1>
        {interaction ? (
          <dl className={styles.facts}>
            <div>
              <dt>{s.interactionId}</dt>
              <dd className={styles.id}>
                <span className="mono">{interaction.id}</span>
                <CopyButton value={interaction.id} label={s.interactionId} />
              </dd>
            </div>
            <div>
              <dt>{s.channel}</dt>
              <dd className={styles.channel}>
                <ChannelIcon size={16} aria-hidden />
                {s.channels[interaction.channel]}
              </dd>
            </div>
            <div>
              <dt>{s.initialReason}</dt>
              <dd>
                {interaction.initialReason ? (
                  isCallReason(interaction.initialReason) ? strings.callReasons[interaction.initialReason] : interaction.initialReason
                ) : (
                  <span className={styles.muted}>{s.initialReasonMissing}</span>
                )}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      {query.isError ? (
        <div className={styles.full}>
          <InlineAlert tone="error" title={s.failed}>
            <p>
              {s.correlation}:{' '}
              <span className="mono">{query.error instanceof ApiError ? (query.error.correlationId ?? '—') : '—'}</span>
            </p>
            <p>
              <Link to="/cases">{s.failedAction}</Link>
            </p>
          </InlineAlert>
        </div>
      ) : (
        <>
          <nav className={styles.cases} aria-label={s.casesRegion}>
            <h2 className={styles.regionTitle}>{s.casesRegion}</h2>
            <p className={styles.muted}>{strings.placeholder.builtIn('M2')}</p>
          </nav>
          <section id="case" className={styles.case} aria-label={s.caseRegion} tabIndex={-1}>
            {missing.length > 0 ? (
              <InlineAlert tone="warning" title={s.partial(missing.map((m) => MISSING_LABELS[m]))} />
            ) : null}
            <h2 className={styles.regionTitle}>{s.caseRegion}</h2>
            <p className={styles.muted}>{strings.placeholder.builtIn('M2')}</p>
          </section>
          <aside id="context" className={styles.context} aria-label={s.contextRegion} tabIndex={-1}>
            <h2 className={styles.regionTitle}>{s.contextRegion}</h2>
            <p className={styles.muted}>{strings.placeholder.builtIn('M3')}</p>
          </aside>
        </>
      )}
    </div>
  );
}
