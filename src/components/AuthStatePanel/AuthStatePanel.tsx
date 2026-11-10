import { AUTH_CHECKS, type AuthCheckId } from '@/config/closeout';
import { strings } from '@/content/strings';
import type { AuthState, CallerType } from '@/domain/types';
import { Button } from '../Button/Button';
import { InlineAlert } from '../InlineAlert/InlineAlert';
import { AuthBadge } from '../StatusBadge/StatusBadge';
import styles from './AuthStatePanel.module.css';

const t = strings.auth;

export interface AuthStatePanelProps {
  state: AuthState;
  checks: Record<AuthCheckId, boolean>;
  verifiedBy?: 'ivr' | 'agent' | undefined;
  callerType: CallerType;
  loading?: boolean;
  denied?: boolean;
  onChange: (next: { state?: AuthState; checks?: Record<AuthCheckId, boolean> }) => void;
}

/** Persistent verification panel, not a modal (docs/02 Auth pattern). */
export function AuthStatePanel({ state, checks, verifiedBy, callerType, loading, denied, onChange }: AuthStatePanelProps) {
  if (loading) {
    return <section className={styles.panel} aria-label={t.title} aria-busy="true"><div className={styles.skeleton} /></section>;
  }
  const allChecked = AUTH_CHECKS.every((c) => checks[c]);
  const someChecked = AUTH_CHECKS.some((c) => checks[c]);
  const checking = state === 'inProgress';

  return (
    <section className={styles.panel} aria-labelledby="auth-title">
      <div className={styles.head}>
        <h2 id="auth-title" className={styles.title}>
          {t.title}
        </h2>
        <AuthBadge state={state} />
      </div>

      {denied ? (
        <p>{t.denied}</p>
      ) : (
        <>
          {callerType === 'authorizedRep' ? <p className={styles.note}>{t.repHelp}</p> : null}
          {state === 'verified' && verifiedBy === 'ivr' ? <p className={styles.note}>{t.verifiedByIvr}</p> : null}
          {state === 'partial' ? <InlineAlert tone="warning" title={t.partialHelp} /> : null}
          {state === 'failed' ? <InlineAlert tone="error" title={t.failedHelp} /> : null}
          {state === 'callerChanged' ? <InlineAlert tone="warning" title={t.callerChangedHelp} /> : null}

          {checking ? (
            <fieldset className={styles.checks}>
              <legend className={styles.legend}>{t.checklistLabel}</legend>
              {AUTH_CHECKS.map((c) => (
                <label key={c} className={styles.check}>
                  <input
                    type="checkbox"
                    checked={checks[c]}
                    onChange={(e) => { onChange({ checks: { ...checks, [c]: e.target.checked } }); }}
                  />
                  {strings.authChecks[c]}
                </label>
              ))}
              {!allChecked ? <p className={styles.note}>{t.needAllChecks}</p> : null}
            </fieldset>
          ) : null}

          <div className={styles.actions}>
            {state === 'notVerified' ? (
              <Button compact variant="primary" onPress={() => { onChange({ state: 'inProgress' }); }}>
                {t.start}
              </Button>
            ) : null}
            {state === 'callerChanged' ? (
              <Button compact variant="primary" onPress={() => { onChange({ state: 'inProgress', checks: resetChecks() }); }}>
                {t.restart}
              </Button>
            ) : null}
            {checking ? (
              <>
                <Button compact variant="primary" isDisabled={!allChecked} onPress={() => { onChange({ state: 'verified' }); }}>
                  {t.verify}
                </Button>
                <Button compact isDisabled={!someChecked || allChecked} onPress={() => { onChange({ state: 'partial' }); }}>
                  {t.partial}
                </Button>
                <Button compact variant="danger" onPress={() => { onChange({ state: 'failed' }); }}>
                  {t.fail}
                </Button>
              </>
            ) : null}
            {state === 'partial' || state === 'failed' ? (
              <Button compact onPress={() => { onChange({ state: 'inProgress' }); }}>
                {t.start}
              </Button>
            ) : null}
            {state !== 'callerChanged' && state !== 'notVerified' ? (
              <Button compact variant="quiet" onPress={() => { onChange({ state: 'callerChanged', checks: resetChecks() }); }}>
                {t.callerChanged}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function resetChecks() {
  return Object.fromEntries(AUTH_CHECKS.map((c) => [c, false])) as Record<AuthCheckId, boolean>;
}
