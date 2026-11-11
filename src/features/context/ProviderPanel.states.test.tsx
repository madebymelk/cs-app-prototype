import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDevStore } from '@/dev/devStore';
import type { Case } from '@/domain/types';
import { DEFAULT_CONTEXT_NAV, type ContextNav } from '@/features/workspace/workspaceStore';
import { makeCase } from '@/test/factories';
import { renderWithClient } from '@/test/renderWithClient';
import { ProviderPanel } from './ProviderPanel';

function Harness({ activeCase, onAssociate }: { activeCase?: Case; onAssociate?: () => void }) {
  const [nav, setNav] = useState<ContextNav>({ ...DEFAULT_CONTEXT_NAV, top: 'provider' });
  return <ProviderPanel nav={nav} onNav={(n) => { setNav((s) => ({ ...s, ...n })); }} activeCase={activeCase} onAssociate={onAssociate} />;
}

describe('ProviderPanel states', () => {
  beforeEach(() => { useDevStore.setState({ scenario: 'happyPath', latencyMs: 0 }); });

  it('validation reasons instead of a generic not-found', async () => {
    const user = userEvent.setup();
    renderWithClient(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Search providers' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter at least one search term.');
    await user.type(screen.getByRole('textbox', { name: 'NPI' }), '12345');
    await user.click(screen.getByRole('button', { name: 'Search providers' }));
    expect(screen.getByText('NPI must be 10 digits.')).toBeInTheDocument();
  });

  it('multiple match + inactive facility + missing address + stale; axe clean', async () => {
    useDevStore.setState({ scenario: 'providerAmbiguousInactive' });
    const user = userEvent.setup();
    const { container } = renderWithClient(<Harness />);
    await user.type(screen.getByRole('textbox', { name: 'Name or organization' }), 'Whitlow');
    await user.click(screen.getByRole('button', { name: 'Search providers' }));
    expect(await screen.findByText('2 providers at 2 facilities')).toBeInTheDocument();
    expect(screen.getByText(/Several providers match/)).toBeInTheDocument();
    expect(screen.getByText('Inactive facility')).toBeInTheDocument();
    expect(screen.getByText('No address on file')).toBeInTheDocument();
    expect(screen.getByText(/Directory data updated/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('no match explains what to try', async () => {
    const user = userEvent.setup();
    renderWithClient(<Harness />);
    await user.type(screen.getByRole('textbox', { name: 'NPI' }), '9999999999');
    await user.click(screen.getByRole('button', { name: 'Search providers' }));
    expect(await screen.findByText(/No providers match 9999999999\. Check the NPI or TIN/)).toBeInTheDocument();
  });

  it('detail: network, enrollment, attestation; associate with the case', async () => {
    const user = userEvent.setup();
    const onAssociate = vi.fn();
    renderWithClient(<Harness activeCase={makeCase({ status: 'open' })} onAssociate={onAssociate} />);
    await user.type(screen.getByRole('textbox', { name: 'Name or organization' }), 'Halvorsen');
    await user.click(screen.getByRole('button', { name: 'Search providers' }));
    await user.click(await screen.findByRole('button', { name: 'Priya Halvorsen, MD' }));
    expect(await screen.findByText('Enrollment')).toBeInTheDocument();
    expect(screen.getByText('Attestation')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Associate with case' }));
    expect(onAssociate).toHaveBeenCalledWith(expect.objectContaining({ id: 'PRV-2004' }));
    await user.click(screen.getByRole('button', { name: /back to find a provider/i }));
    expect(screen.getByRole('heading', { name: 'Find a provider' })).toBeInTheDocument();
  });
});
