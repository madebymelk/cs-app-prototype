import { useEffect, useState } from 'react';
import { isCallReason } from '@/config/caseTypes';
import { formatElapsed } from '@/content/format';
import { strings } from '@/content/strings';
import { ArrowRight, MessageSquare, PanelRight, Phone, PhoneOff } from '@/design/icons';
import type { AuthState, Case, Interaction } from '@/domain/types';
import { Button } from '../Button/Button';
import { CopyButton } from '../CopyButton/CopyButton';
import { AuthBadge } from '../StatusBadge/StatusBadge';
import styles from './InteractionHeader.module.css';

const t = strings.workspace.header;
const s = strings.pages.interaction;

export const reasonLabel = (r: string | undefined) => (r ? (isCallReason(r) ? strings.callReasons[r] : r) : undefined);

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => { setNow(Date.now()); }, intervalMs);
    return () => { clearInterval(id); };
  }, [intervalMs]);
  return now;
}

/** Elapsed time. Not a live region: timers are never announced (docs/06). */
function Elapsed({ since }: { since: string }) {
  const now = useNow(1000);
  return <span className={styles.timer}>{formatElapsed(now - Date.parse(since))}</span>;
}

export interface InteractionHeaderProps {
  interaction?: Interaction | undefined;
  loading?: boolean;
  authState?: AuthState | undefined;
  activeCase?: Case | undefined;
  cases?: Case[];
  narrow?: boolean;
  contextOpen?: boolean;
  onToggleContext?: () => void;
  /** ID of the context region the toggle controls (only set when it is in the DOM). */
  contextId?: string;
  onSwitchCase?: (caseId: string) => void;
  onEnd?: () => void;
}

/** Region B: sticky interaction header. Never scrolls away, never hidden (docs/02). */
export function InteractionHeader({
  interaction,
  loading,
  authState,
  activeCase,
  cases = [],
  narrow,
  contextOpen,
  onToggleContext,
  contextId,
  onSwitchCase,
  onEnd,
}: InteractionHeaderProps) {
  const ChannelIcon = interaction?.channel === 'chat' ? MessageSquare : Phone;
  return (
    <section id="interaction" className={styles.header} aria-labelledby="interaction-title" aria-busy={loading}>
      <div className={styles.caller}>
        <h1 id="interaction-title" className={styles.name}>
          {loading ? s.loading : (interaction?.caller.name ?? s.callerUnknown)}
        </h1>
        {interaction ? <span className={styles.callerType}>{strings.callerTypes[interaction.caller.type]}</span> : null}
      </div>
      {interaction ? (
        <dl className={styles.facts}>
          {authState ? (
            <div>
              <dt className="visually-hidden">{strings.auth.title}</dt>
              <dd>
                <AuthBadge state={authState} />
              </dd>
            </div>
          ) : null}
          <div>
            <dt>{s.interactionId}</dt>
            <dd className={styles.inline}>
              <span className="mono">{interaction.id}</span>
              <CopyButton value={interaction.id} label={s.interactionId} />
            </dd>
          </div>
          <div>
            <dt>{s.channel}</dt>
            <dd className={styles.inline}>
              <ChannelIcon size={16} aria-hidden />
              {s.channels[interaction.channel]}
            </dd>
          </div>
          <div>
            <dt>{t.elapsed}</dt>
            <dd>
              <Elapsed since={interaction.startedAt} />
            </dd>
          </div>
          <div className={styles.reasons}>
            <dt>
              {s.initialReason} <ArrowRight size={12} aria-hidden /> {t.finalReason}
            </dt>
            <dd className={styles.inline}>
              <span>{reasonLabel(interaction.initialReason) ?? s.initialReasonMissing}</span>
              <ArrowRight size={16} aria-hidden />
              <span className="visually-hidden">{t.finalReason}:</span>
              <strong>{reasonLabel(activeCase?.finalReason) ?? t.finalReasonNone}</strong>
            </dd>
          </div>
        </dl>
      ) : null}
      <div className={styles.actions}>
        {narrow && cases.length > 0 && activeCase ? (
          <label className={styles.switcher}>
            <span className="visually-hidden">{t.caseSwitcher}</span>
            <select
              value={activeCase.id}
              onChange={(e) => onSwitchCase?.(e.target.value)}
              aria-keyshortcuts="Alt+Shift+1"
            >
              {cases.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {`${String(i + 1)}. ${c.id} · ${strings.caseStatus[c.status]}`}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {onToggleContext ? (
          <Button
            compact
            onPress={onToggleContext}
            aria-expanded={contextOpen}
            {...(contextId ? { 'aria-controls': contextId } : {})}
            aria-keyshortcuts="Alt+Shift+C"
          >
            <PanelRight size={16} aria-hidden />
            {contextOpen ? t.hideContext : t.showContext}
          </Button>
        ) : null}
        {interaction && onEnd ? (
          <Button compact variant="danger" onPress={onEnd}>
            <PhoneOff size={16} aria-hidden />
            {t.endInteraction}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
