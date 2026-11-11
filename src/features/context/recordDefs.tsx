import type { ReactNode } from 'react';
import type { Column } from '@/components/DataTable/DataTable';
import { formatDate } from '@/content/format';
import { strings } from '@/content/strings';
import type { Claim, EdEvent, EligibilityRecord, PriorAuth, Referral, Rfs, UmReview } from '@/domain/types';
import type { RecordKind } from '@/mocks/records';

const c = strings.context.records.columns;
const status = (s: string) => strings.context.recordStatus[s] ?? s;

export interface RecordDef<T> {
  columns: Column<T>[];
  sortKey: string;
  title: (row: T) => string;
  facts: (row: T) => [string, ReactNode][];
}

const def = <T,>(d: RecordDef<T>) => d as unknown as RecordDef<unknown>;

/** Column and detail definitions for each authoritative record type (non-clinical fields only). */
export const RECORD_DEFS: Record<Exclude<RecordKind, 'cases'>, RecordDef<unknown>> = {
  referrals: def<Referral>({
    sortKey: 'issued',
    title: (r) => r.number,
    columns: [
      { key: 'number', header: c.number, render: (r) => r.number },
      { key: 'specialty', header: c.specialty, render: (r) => r.specialty },
      { key: 'status', header: c.status, render: (r) => status(r.status) },
      { key: 'issued', header: c.issued, render: (r) => formatDate(r.issuedOn), sortValue: (r) => r.issuedOn },
    ],
    facts: (r) => [[c.number, r.number], [c.specialty, r.specialty], [c.status, status(r.status)], [c.provider, r.providerName], [c.issued, formatDate(r.issuedOn)], [c.expires, formatDate(r.expiresOn)]],
  }),
  claims: def<Claim>({
    sortKey: 'serviceDate',
    title: (r) => r.number,
    columns: [
      { key: 'number', header: c.number, render: (r) => r.number },
      { key: 'type', header: c.type, render: (r) => strings.context.claimKinds[r.kind] ?? r.kind },
      { key: 'status', header: c.status, render: (r) => status(r.status) },
      { key: 'serviceDate', header: c.serviceDate, render: (r) => formatDate(r.serviceDate), sortValue: (r) => r.serviceDate },
    ],
    facts: (r) => [[c.number, r.number], [c.type, strings.context.claimKinds[r.kind] ?? r.kind], [c.status, status(r.status)], [c.provider, r.providerName], [c.serviceDate, formatDate(r.serviceDate)]],
  }),
  rfs: def<Rfs>({
    sortKey: 'submitted',
    title: (r) => r.number,
    columns: [
      { key: 'number', header: c.number, render: (r) => r.number },
      { key: 'specialty', header: c.specialty, render: (r) => r.specialty },
      { key: 'status', header: c.status, render: (r) => status(r.status) },
      { key: 'submitted', header: c.submitted, render: (r) => formatDate(r.submittedOn), sortValue: (r) => r.submittedOn },
    ],
    facts: (r) => [[c.number, r.number], [c.specialty, r.specialty], [c.status, status(r.status)], [c.submitted, formatDate(r.submittedOn)]],
  }),
  pa: def<PriorAuth>({
    sortKey: 'requested',
    title: (r) => r.number,
    columns: [
      { key: 'number', header: c.number, render: (r) => r.number },
      { key: 'service', header: c.service, render: (r) => r.service },
      { key: 'status', header: c.status, render: (r) => status(r.status) },
      { key: 'requested', header: c.requested, render: (r) => formatDate(r.requestedOn), sortValue: (r) => r.requestedOn },
    ],
    facts: (r) => [[c.number, r.number], [c.service, r.service], [c.status, status(r.status)], [c.requested, formatDate(r.requestedOn)]],
  }),
  um: def<UmReview>({
    sortKey: 'opened',
    title: (r) => r.number,
    columns: [
      { key: 'number', header: c.number, render: (r) => r.number },
      { key: 'reviewType', header: c.reviewType, render: (r) => r.reviewType },
      { key: 'status', header: c.status, render: (r) => status(r.status) },
      { key: 'opened', header: c.opened, render: (r) => formatDate(r.openedOn), sortValue: (r) => r.openedOn },
    ],
    facts: (r) => [[c.number, r.number], [c.reviewType, r.reviewType], [c.status, status(r.status)], [c.opened, formatDate(r.openedOn)]],
  }),
  ucern: def<EligibilityRecord>({
    sortKey: 'created',
    title: (r) => r.number,
    columns: [
      { key: 'number', header: c.number, render: (r) => r.number },
      { key: 'facility', header: c.facility, render: (r) => r.facilityName },
      { key: 'status', header: c.status, render: (r) => status(r.status) },
      { key: 'created', header: c.created, render: (r) => formatDate(r.createdOn), sortValue: (r) => r.createdOn },
    ],
    facts: (r) => [[c.number, r.number], [c.facility, r.facilityName], [c.status, status(r.status)], [c.created, formatDate(r.createdOn)]],
  }),
  vpern: def<EligibilityRecord>({
    sortKey: 'created',
    title: (r) => r.number,
    columns: [
      { key: 'number', header: c.number, render: (r) => r.number },
      { key: 'facility', header: c.facility, render: (r) => r.facilityName },
      { key: 'status', header: c.status, render: (r) => status(r.status) },
      { key: 'created', header: c.created, render: (r) => formatDate(r.createdOn), sortValue: (r) => r.createdOn },
    ],
    facts: (r) => [[c.number, r.number], [c.facility, r.facilityName], [c.status, status(r.status)], [c.created, formatDate(r.createdOn)]],
  }),
  ed: def<EdEvent>({
    sortKey: 'arrived',
    title: (r) => r.facilityName,
    columns: [
      { key: 'facility', header: c.facility, render: (r) => r.facilityName },
      { key: 'arrived', header: c.arrived, render: (r) => formatDate(r.arrivedOn), sortValue: (r) => r.arrivedOn },
      { key: 'notified', header: c.notified, render: (r) => (r.notifiedWithin72h ? strings.context.records.yes : strings.context.records.no) },
    ],
    facts: (r) => [[c.facility, r.facilityName], [c.arrived, formatDate(r.arrivedOn)], [c.notified, r.notifiedWithin72h ? strings.context.records.yes : strings.context.records.no]],
  }),
};
