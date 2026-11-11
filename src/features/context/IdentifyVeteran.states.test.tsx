import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDevStore } from '@/dev/devStore';
import { mockDb } from '@/mocks/db';
import { renderWithClient } from '@/test/renderWithClient';
import { IdentifyVeteran } from './IdentifyVeteran';

describe('IdentifyVeteran states', () => {
  beforeEach(() => { useDevStore.setState({ scenario: 'happyPath', latencyMs: 0 }); });

  it('multiple match: disambiguation with DOB, last 4 and masked ICN; select links; axe clean', async () => {
    const i = mockDb.createInteraction({ channel: 'voice', scenario: 'veteranMultipleMatch' });
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithClient(<IdentifyVeteran callerName={i.caller.name} onSelect={onSelect} />);
    expect(await screen.findByText(/possible matches\. Confirm with the caller/)).toBeInTheDocument();
    expect(screen.getAllByText(/masked, ending in/).length).toBeGreaterThanOrEqual(3);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getAllByRole('button', { name: new RegExp(`^Select ${i.caller.name!}`) })[0]!);
    expect(onSelect).toHaveBeenCalled();
  });

  it('no match: explains and suggests what to try', async () => {
    const user = userEvent.setup();
    renderWithClient(<IdentifyVeteran onSelect={vi.fn()} />);
    await user.type(screen.getByRole('textbox', { name: 'Last name' }), 'Nobodyhere');
    await user.click(screen.getByRole('button', { name: 'Search Veterans' }));
    expect(await screen.findByText(/No Veteran matches these identifiers\. Check spelling/)).toBeInTheDocument();
  });

  it('empty form asks for an identifier', async () => {
    const user = userEvent.setup();
    renderWithClient(<IdentifyVeteran onSelect={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Search Veterans' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter at least one identifier.');
  });

  it('source down: search failure names the source', async () => {
    useDevStore.setState({ scenario: 'profileServiceDown' });
    renderWithClient(<IdentifyVeteran callerName="Avery Okafor" onSelect={vi.fn()} />);
    expect(await screen.findByText(/Veteran profile service isn't responding/)).toBeInTheDocument();
  });
});
