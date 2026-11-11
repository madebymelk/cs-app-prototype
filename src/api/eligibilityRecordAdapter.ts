import type { EligibilityRecord } from '@/domain/types';
import { apiSend } from './client';

export const ELIGIBILITY_RECORD_SOURCE = 'Eligibility record service';

export const eligibilityRecordAdapter = {
  /** The idempotency key makes a retry after a failure return the same record instead of a duplicate. */
  create: (payload: {
    idempotencyKey: string;
    kind: 'ucern' | 'vpern';
    veteranId: string;
    providerId: string;
    facilityName: string;
    dateOfService: string;
    caseId: string;
  }) => apiSend<EligibilityRecord>('POST', '/eligibility-records', payload, ELIGIBILITY_RECORD_SOURCE),
};
