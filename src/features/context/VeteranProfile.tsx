import { useQuery } from '@tanstack/react-query';
import { veteranAdapter } from '@/api/veteranAdapter';
import { SOURCE_NAMES } from '@/api/sources';
import { usePermission } from '@/app/usePermission';
import { useSession } from '@/app/sessionStore';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { MaskedValue } from '@/components/MaskedValue/MaskedValue';
import { Facts, ReadOnlyBlock } from '@/components/ReadOnlyBlock/ReadOnlyBlock';
import { SourceSection } from '@/components/SourceSection/SourceSection';
import { formatDate } from '@/content/format';
import { strings } from '@/content/strings';
import { CircleAlert, CircleCheck, CircleHelp, Clock, TriangleAlert } from '@/design/icons';
import { auditEvent, auditLog } from '@/domain/audit';
import { eligibilityDisplay } from '@/domain/eligibility';
import type { EligibilityStatus } from '@/domain/types';
import styles from './context.module.css';

const p = strings.context.profile;
const e = strings.context.eligibility;
const TONE_ICON = { success: CircleCheck, error: CircleAlert, warning: TriangleAlert, info: Clock } as const;

/** Veteran profile and eligibility (F7). Read-only; each source loads and fails on its own. */
export function VeteranProfile({ veteranId, headingLevel = 3 }: { veteranId: string; headingLevel?: 2 | 3 }) {
  const canReveal = usePermission('canRevealMasked');
  const userId = useSession((s) => s.userId);
  const profileKey = ['veteran', veteranId] as const;
  const eligibilityKey = ['eligibility', veteranId] as const;
  const profile = useQuery({ queryKey: profileKey, queryFn: ({ signal }) => veteranAdapter.get(veteranId, signal), retry: false });
  const eligibility = useQuery({ queryKey: eligibilityKey, queryFn: ({ signal }) => veteranAdapter.eligibility(veteranId, signal), retry: false });

  return (
    <div className={styles.stack}>
      <SourceSection source={SOURCE_NAMES.profile} query={profile} queryKey={profileKey} skeletonRows={4} updatedAt={(v) => v.updatedAt}>
        {(v) => (
          <ReadOnlyBlock title={p.title} headingLevel={headingLevel} source={SOURCE_NAMES.profile} updatedAt={v.updatedAt}>
            {v.dateOfDeath ? <InlineAlert tone="warning" title={p.deceasedBanner(formatDate(v.dateOfDeath))} /> : null}
            <Facts
              items={[
                [p.name, `${v.firstName} ${v.lastName}`],
                [p.gender, v.gender],
                [p.dob, formatDate(v.dob)],
                ...(v.dateOfDeath ? ([[p.dateOfDeath, <strong key="dod">{`${p.deceased} · ${formatDate(v.dateOfDeath)}`}</strong>]] as [string, React.ReactNode][]) : []),
                [p.memberId, <span key="m" className="mono">{v.memberId}</span>],
                [p.ssnLast4, <span key="s" className="mono">{v.ssnLast4}</span>],
                [
                  p.icn,
                  <MaskedValue
                    key="icn"
                    value={v.icn}
                    label={p.icn}
                    canReveal={canReveal}
                    onReveal={() => { auditLog.emit(auditEvent(userId, 'masked.reveal', { changedFields: ['icn'], refIds: [v.id] })); }}
                  />,
                ],
                [p.preferredFacility, v.preferredFacilityName ?? '—'],
                [p.phone, v.phone ?? '—'],
                [
                  p.address,
                  v.address ? (
                    <span key="a">
                      {`${v.address.line1}, ${v.address.city}, ${v.address.state} ${v.address.zip}`}
                      {v.addressSource ? <span className={`${styles.muted} ${styles.block}`}>{p.addressSource(v.addressSource)}</span> : null}
                    </span>
                  ) : (
                    '—'
                  ),
                ],
              ]}
            />
          </ReadOnlyBlock>
        )}
      </SourceSection>

      <SourceSection source={SOURCE_NAMES.eligibility} query={eligibility} queryKey={eligibilityKey} updatedAt={(d) => d.updatedAt}>
        {(d) => (
          <ReadOnlyBlock title={e.title} headingLevel={headingLevel} source={d.source} updatedAt={d.updatedAt}>
            <ul className={styles.eligibility}>
              {d.items.map((item) => (
                <li key={item.type}>
                  <span>{e.types[item.type]}</span>
                  <EligibilityStatusText status={item.status} />
                </li>
              ))}
            </ul>
            <p className={styles.muted}>{e.pharmacyNote}</p>
          </ReadOnlyBlock>
        )}
      </SourceSection>
    </div>
  );
}

/** Icon + text, never color alone. Unknown/unavailable use a question/warning icon, never the error one. */
export function EligibilityStatusText({ status }: { status: EligibilityStatus }) {
  const { tone, labelKey } = eligibilityDisplay(status);
  const Icon = status === 'unknown' ? CircleHelp : TONE_ICON[tone];
  return (
    <span className={`${styles.status} ${styles[tone]}`}>
      <Icon size={16} aria-hidden />
      {e.statuses[labelKey]}
    </span>
  );
}
