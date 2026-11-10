import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { generateInteraction, mulberry32 } from '@/mocks/seed';
import { completeCase } from '@/test/factories';
import { InteractionHeader } from './InteractionHeader';

const interaction = generateInteraction(mulberry32(5), { channel: 'voice', now: new Date() });

describe('InteractionHeader states', () => {
  it('default: caller, auth, ID, channel, initial → final reason, end; axe clean', async () => {
    const { container } = render(
      <InteractionHeader
        interaction={{ ...interaction, initialReason: 'claimFiling' }}
        authState="verified"
        activeCase={completeCase({ finalReason: 'pharmacyClaim' })}
        onEnd={vi.fn()}
        onToggleContext={vi.fn()}
        contextOpen
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: interaction.caller.name! })).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText(interaction.id)).toBeInTheDocument();
    expect(screen.getByText('Claim filing')).toBeInTheDocument();
    expect(screen.getByText('Pharmacy claim')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End interaction' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('loading: busy with a loading title', () => {
    render(<InteractionHeader loading />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Loading interaction');
    expect(screen.getByRole('region', { name: 'Loading interaction' })).toHaveAttribute('aria-busy', 'true');
  });

  it('partial: unknown caller and missing IVR reason are named, not blank', () => {
    const partial = { ...interaction, caller: { ...interaction.caller } };
    delete partial.caller.name;
    delete partial.initialReason;
    render(<InteractionHeader interaction={partial} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Unknown caller');
    expect(screen.getByText('Not provided by IVR')).toBeInTheDocument();
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('error / timeout / source down: renders a stable header with no interaction', async () => {
    const { container } = render(<InteractionHeader />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Unknown caller');
    expect(screen.queryByRole('button', { name: 'End interaction' })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('narrow: offers a case switcher in the header', () => {
    const cases = [completeCase({ id: 'CS-2026-000001' }), completeCase({ id: 'CS-2026-000002', status: 'closed' })];
    render(<InteractionHeader interaction={interaction} activeCase={cases[0]} cases={cases} narrow />);
    expect(screen.getByRole('combobox', { name: 'Active case' })).toHaveDisplayValue(/CS-2026-000001/);
  });
});
