import { formatRelative } from '@/content/format';
import { strings } from '@/content/strings';
import { Plus } from '@/design/icons';
import { reasonLabel } from '../InteractionHeader/InteractionHeader';
import type { Case } from '@/domain/types';
import { Button } from '../Button/Button';
import { InlineAlert } from '../InlineAlert/InlineAlert';
import { CaseStatusBadge } from '../StatusBadge/StatusBadge';
import styles from './CaseNavigator.module.css';

const t = strings.workspace.navigator;

export interface CaseNavigatorProps {
  cases: Case[];
  activeId?: string | undefined;
  currentUserId: string;
  ownerNames?: Record<string, string>;
  canAdd: boolean;
  adding?: boolean;
  error?: string | undefined;
  onSelect: (caseId: string) => void;
  onAdd: () => void;
  /** This caller's earlier cases (read-only). Undefined until the Veteran is identified. */
  priorCases?: Case[] | undefined;
  onOpenPrior?: (caseId: string) => void;
}

/** Region C: one interaction's cases, one focused at a time (no tabs, docs/02 multi-case pattern). */
export function CaseNavigator({
  cases,
  activeId,
  currentUserId,
  ownerNames = {},
  canAdd,
  adding,
  error,
  onSelect,
  onAdd,
  priorCases,
  onOpenPrior,
}: CaseNavigatorProps) {
  return (
    <nav className={styles.nav} aria-labelledby="case-nav-title">
      <div className={styles.head}>
        <h2 id="case-nav-title" className={styles.title}>
          {t.title}
        </h2>
      </div>
      {error ? <InlineAlert tone="error" title={error} /> : null}
      {cases.length === 0 && !error ? (
        <div className={styles.empty}>
          <p>{t.empty}</p>
          <p className={styles.muted}>{t.emptyAction}</p>
        </div>
      ) : (
        <ol className={styles.list}>
          {cases.map((c, i) => {
            const active = c.id === activeId;
            const owner = c.ownerId !== currentUserId ? (ownerNames[c.ownerId] ?? c.ownerId) : undefined;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`${styles.item} ${active ? styles.active : ''}`}
                  aria-current={active ? 'true' : undefined}
                  aria-keyshortcuts={i < 9 ? t.position(i + 1) : undefined}
                  onClick={() => { onSelect(c.id); }}
                >
                  <span className={styles.row}>
                    <span className="mono">{c.id}</span>
                    {i < 9 ? <kbd className={styles.kbd} aria-hidden>{i + 1}</kbd> : null}
                  </span>
                  <span className={styles.reason}>{reasonLabel(c.finalReason) ?? strings.workspace.header.finalReasonNone}</span>
                  <CaseStatusBadge status={c.status} />
                  {owner ? <span className={styles.muted}>{t.ownedBy(owner)}</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {canAdd ? (
        <Button onPress={onAdd} isDisabled={adding} aria-keyshortcuts="Alt+Shift+N" className={styles.add}>
          <Plus size={16} aria-hidden />
          {t.addCase}
        </Button>
      ) : null}
      <section className={styles.prior} aria-labelledby="prior-title">
        <h2 id="prior-title" className={styles.subtitle}>
          {t.priorTitle}
        </h2>
        {priorCases === undefined ? (
          <p className={styles.muted}>{t.priorUnknown}</p>
        ) : priorCases.length === 0 ? (
          <p className={styles.muted}>{t.priorEmpty}</p>
        ) : (
          <ul className={styles.priorList}>
            {priorCases.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={styles.priorItem}
                  onClick={() => onOpenPrior?.(c.id)}
                  aria-label={strings.context.prior.view(c.id)}
                >
                  <span className="mono">{c.id}</span>
                  <span>{reasonLabel(c.finalReason) ?? strings.workspace.header.finalReasonNone}</span>
                  <span className={styles.muted}>{formatRelative(c.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </nav>
  );
}
