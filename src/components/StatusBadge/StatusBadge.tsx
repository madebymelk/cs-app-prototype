import type { LucideIcon } from 'lucide-react';
import { strings } from '@/content/strings';
import {
  Ban,
  Circle,
  CircleCheck,
  CircleCheckBig,
  CircleDashed,
  Clock,
  RotateCcw,
  ShieldCheck,
  ShieldEllipsis,
  ShieldHalf,
  ShieldOff,
  ShieldQuestion,
  ShieldX,
  Trash2,
  UserRoundX,
} from '@/design/icons';
import type { AuthState, CaseStatus } from '@/domain/types';
import styles from './StatusBadge.module.css';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

const CASE: Record<CaseStatus, [LucideIcon, Tone]> = {
  draft: [CircleDashed, 'neutral'],
  open: [Circle, 'info'],
  pendingDownstream: [Clock, 'warning'],
  readyToClose: [CircleCheckBig, 'info'],
  closed: [CircleCheck, 'success'],
  reopened: [RotateCcw, 'info'],
  discarded: [Trash2, 'neutral'],
  canceled: [Ban, 'neutral'],
};

const AUTH: Record<AuthState, [LucideIcon, Tone]> = {
  notVerified: [ShieldQuestion, 'neutral'],
  inProgress: [ShieldEllipsis, 'info'],
  verified: [ShieldCheck, 'success'],
  partial: [ShieldHalf, 'warning'],
  failed: [ShieldX, 'error'],
  bypassed: [ShieldOff, 'warning'],
  callerChanged: [UserRoundX, 'warning'],
};

/** Status = icon + text + color, never color alone (docs/02). */
function Badge({ icon: Icon, tone, label }: { icon: LucideIcon; tone: Tone; label: string }) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      <Icon size={16} aria-hidden className={styles.icon} />
      <span>{label}</span>
    </span>
  );
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const [icon, tone] = CASE[status];
  return <Badge icon={icon} tone={tone} label={strings.caseStatus[status]} />;
}

export function AuthBadge({ state }: { state: AuthState }) {
  const [icon, tone] = AUTH[state];
  return <Badge icon={icon} tone={tone} label={strings.authStates[state]} />;
}
