import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '@/app/sessionStore';
import { useDevStore } from '@/dev/devStore';
import { mockDb } from '@/mocks/db';
import { renderWithClient } from '@/test/renderWithClient';
import { VeteranProfile } from './VeteranProfile';

const veteranId = () => mockDb.searchVeterans({})[0]!.id;

describe('VeteranProfile states', () => {
  beforeEach(() => {
    useSession.setState({ roleId: 'csr' });
    useDevStore.setState({ scenario: 'happyPath', latencyMs: 0 });
  });

  it('default: read-only profile with source tag and eligibility by type; axe clean', async () => {
    const { container } = renderWithClient(<VeteranProfile veteranId={veteranId()} />);
    expect(await screen.findByRole('heading', { name: /veteran profile/i })).toBeInTheDocument();
    expect(screen.getAllByText(/^Source: Veteran profile service/).length).toBeGreaterThan(0);
    expect(await screen.findByText('Community care')).toBeInTheDocument();
    expect(screen.getByText(/does not include pharmacy/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reveal icn/i })).not.toBeInTheDocument(); // CSR can't reveal
    expect(await axe(container)).toHaveNoViolations();
  });

  it('eligibility unknown is never shown as "not eligible"', async () => {
    useDevStore.setState({ scenario: 'eligibilityUnknown' });
    renderWithClient(<VeteranProfile veteranId={veteranId()} />);
    expect((await screen.findAllByText('Unknown')).length).toBe(2);
    expect(screen.getByText("Couldn't check")).toBeInTheDocument();
    expect(screen.queryByText('Not eligible')).not.toBeInTheDocument();
  });

  it('deceased: banner and date of death, icon + text', async () => {
    const i = mockDb.createInteraction({ channel: 'voice', scenario: 'veteranDeceased' });
    renderWithClient(<VeteranProfile veteranId={i.caller.identifiers.veteranId!} />);
    expect(await screen.findByText(/^Deceased .*Confirm who is calling/)).toBeInTheDocument();
    expect(screen.getByText('Date of death')).toBeInTheDocument();
  });

  it('profile service down: names the source; does not say not found', async () => {
    useDevStore.setState({ scenario: 'profileServiceDown' });
    renderWithClient(<VeteranProfile veteranId={veteranId()} />);
    expect(await screen.findByText("Veteran profile service isn't responding. You can keep working on this case.")).toBeInTheDocument();
    expect(await screen.findByText("Eligibility service isn't responding. You can keep working on this case.")).toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });

  it('roles with reveal permission get an audited reveal button', async () => {
    useSession.setState({ roleId: 'supervisor' });
    renderWithClient(<VeteranProfile veteranId={veteranId()} />);
    expect(await screen.findByRole('button', { name: 'Reveal ICN' })).toBeInTheDocument();
  });
});
