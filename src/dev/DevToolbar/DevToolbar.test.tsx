import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useSession } from '@/app/sessionStore';
import { useDevStore } from '@/dev/devStore';
import { renderApp } from '@/test/render';

describe('DevToolbar', () => {
  beforeEach(() => {
    useSession.setState({ roleId: 'csr' });
    useDevStore.setState({ scenario: 'happyPath', toolbarOpen: true, latencyMs: 0 });
  });

  it('is axe clean when open', async () => {
    const { container } = renderApp('/');
    await screen.findByText('Systems OK');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('switches role and scenario with the keyboard', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const toolbar = screen.getByRole('complementary', { name: 'Prototype controls' });

    await user.click(within(toolbar).getByRole('button', { name: /role/i }));
    await user.click(await screen.findByRole('option', { name: 'Supervisor' }));
    expect(useSession.getState().roleId).toBe('supervisor');

    await user.click(within(toolbar).getByRole('button', { name: /scenario/i }));
    await user.click(await screen.findByRole('option', { name: 'Profile service down' }));
    expect(useDevStore.getState().scenario).toBe('profileServiceDown');
    expect(await screen.findByText('Degraded: Veteran profile service')).toBeInTheDocument();
  });

  it('simulates a voice call into the live workspace', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Voice call' }));
    expect(router.state.location.pathname).toMatch(/^\/interaction\/INT-[A-Z0-9]{6}$/);
    expect(await screen.findByText('Initial reason (IVR)')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Cases in this interaction' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Context' })).toBeInTheDocument();
  });

  it('lists missing fields for a partial screen pop', async () => {
    useDevStore.setState({ scenario: 'screenPopPartial' });
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Chat' }));
    expect(await screen.findByText(/screen pop is missing: caller, initial reason \(ivr\)/i)).toBeInTheDocument();
  });

  it('shows a failed screen pop with a correlation ID and manual path', async () => {
    useDevStore.setState({ scenario: 'screenPopFailed' });
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Voice call' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/COR-/);
    expect(within(alert).getByRole('link', { name: 'Search cases' })).toBeInTheDocument();
  });
});
