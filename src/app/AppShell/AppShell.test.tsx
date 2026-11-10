import { beforeEach, describe, expect, it } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { useSession } from '@/app/sessionStore';
import { renderApp } from '@/test/render';

describe('AppShell', () => {
  beforeEach(() => {
    useSession.setState({ roleId: 'csr' });
  });

  it('renders the shell landmarks with zero axe violations', async () => {
    const { container } = renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /welcome back, jordan/i })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(await screen.findByText('Systems OK')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('updates nav for the role without a reload', async () => {
    renderApp('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Cases' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();

    act(() => { useSession.getState().setRole('admin'); });
    expect(await within(nav).findByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Cases' })).not.toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('guards the admin route for non-admin roles', async () => {
    renderApp('/admin');
    expect(await screen.findByRole('heading', { level: 1, name: 'Access denied' })).toBeInTheDocument();
    expect(screen.getByText(/you don't have access to administration/i)).toBeInTheDocument();
  });

  it('guards case routes by permission: admin is denied, QA is allowed', async () => {
    useSession.setState({ roleId: 'admin' });
    const { unmount } = renderApp('/cases');
    expect(await screen.findByRole('heading', { level: 1, name: 'Access denied' })).toBeInTheDocument();
    unmount();
    useSession.setState({ roleId: 'qa' });
    renderApp('/cases');
    expect(await screen.findByRole('heading', { level: 1, name: 'Cases' })).toBeInTheDocument();
  });

  it('shows the training banner for trainers', () => {
    useSession.setState({ roleId: 'trainer' });
    renderApp('/');
    expect(screen.getByRole('note')).toHaveTextContent(/training environment/i);
  });
});
