import { useQuery } from '@tanstack/react-query';
import { act, fireEvent, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { renderWithClient } from '@/test/renderWithClient';
import { SourceSection } from './SourceSection';

interface Data { items: string[]; updatedAt: string }

function Harness({ fn, id }: { fn: () => Promise<Data>; id: string }) {
  const key = ['harness', id];
  const q = useQuery({ queryKey: key, queryFn: fn, retry: false });
  return (
    <SourceSection
      source="Referral system"
      query={q}
      queryKey={key}
      isEmpty={(d) => d.items.length === 0}
      emptyText="No referrals found."
      updatedAt={(d) => d.updatedAt}
      deniedThing="referrals"
    >
      {(d) => <ul>{d.items.map((x) => <li key={x}>{x}</li>)}</ul>}
    </SourceSection>
  );
}

const now = () => new Date().toISOString();

describe('SourceSection states', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('default: renders the data; axe clean', async () => {
    const { container } = renderWithClient(<Harness id="ok" fn={() => Promise.resolve({ items: ['REF-1'], updatedAt: now() })} />);
    expect(await screen.findByText('REF-1')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('empty: only when the source answered with zero', async () => {
    renderWithClient(<Harness id="empty" fn={() => Promise.resolve({ items: [], updatedAt: now() })} />);
    expect(await screen.findByText('No referrals found.')).toBeInTheDocument();
  });

  it('source down: names the source, shows the correlation ID, retries; never says "not found"', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new ApiError('down', 503, 'COR-XYZ-0001', 'Referral system'))
      .mockResolvedValueOnce({ items: ['REF-2'], updatedAt: now() });
    renderWithClient(<Harness id="down" fn={fn} />);
    expect(await screen.findByText("Referral system isn't responding. You can keep working on this case.")).toBeInTheDocument();
    expect(screen.getByText('COR-XYZ-0001')).toBeInTheDocument();
    expect(screen.queryByText('No referrals found.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('REF-2')).toBeInTheDocument();
  });

  it('denied: no data hints, denied copy', async () => {
    renderWithClient(<Harness id="denied" fn={() => Promise.reject(new ApiError('no', 403, undefined, 'Referral system'))} />);
    expect(await screen.findByText("You don't have access to referrals. Contact your supervisor if you need it.")).toBeInTheDocument();
  });

  it('stale: shows the age and a refresh action', async () => {
    const old = new Date(Date.now() - 14 * 60_000).toISOString();
    renderWithClient(<Harness id="stale" fn={() => Promise.resolve({ items: ['REF-3'], updatedAt: old })} />);
    expect(await screen.findByText('Updated 14 min ago. This may be out of date.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('loading → still loading after 10s → stop → retry', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithClient(<Harness id="slow" fn={() => new Promise<Data>(() => undefined)} />);
    expect(screen.getByLabelText('Loading Referral system')).toHaveAttribute('aria-busy', 'true');
    act(() => { vi.advanceTimersByTime(10_001); });
    expect(screen.getByText('Still loading Referral system.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop loading' }));
    expect(screen.getByText('Stopped loading Referral system.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
