/** Business names of each authoritative source, shown in loading, error and freshness messages. */
export const SOURCE_NAMES = {
  profile: 'Veteran profile service',
  eligibility: 'Eligibility service',
  referrals: 'Referral system',
  claims: 'Claims system',
  cases: 'Case service',
  rfs: 'RFS system',
  pa: 'Prior authorization system',
  um: 'Utilization management system',
  ucern: 'UCERN records',
  vpern: 'VPERN records',
  ed: 'ED notification system',
  providers: 'Provider directory',
} as const;
