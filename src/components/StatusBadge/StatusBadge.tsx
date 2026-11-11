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

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

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
export function Badge({ icon: Icon, tone, label }: { icon: LucideIcon; tone: Tone; label: string }) {
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

const DOWNSTREAM: Record<string, [LucideIcon, Tone]> = {
  draft: [CircleDashed, 'neutral'],
  submitting: [Clock, 'info'],
  new: [Circle, 'info'],
  assigned: [Circle, 'info'],
  inProgress: [Circle, 'info'],
  pending: [Clock, 'warning'],
  pendingAction: [Clock, 'warning'],
  slaRisk: [Clock, 'warning'],
  blocked: [Ban, 'error'],
  failed: [Ban, 'error'],
  resolved: [CircleCheck, 'success'],
  rerouted: [RotateCcw, 'info'],
};

/** Escalation / workflow status badge. */
export function DownstreamBadge({ status, label }: { status: string; label: string }) {
  const [icon, tone] = DOWNSTREAM[status] ?? [Circle, 'neutral'];
  return <Badge icon={icon} tone={tone} label={label} />;
}
