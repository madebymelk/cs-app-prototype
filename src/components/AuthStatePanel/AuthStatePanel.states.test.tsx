import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import type { AuthState } from '@/domain/types';
import { AuthStatePanel } from './AuthStatePanel';

const none = { fullName: false, dateOfBirth: false, ssnLast4: false };
const all = { fullName: true, dateOfBirth: true, ssnLast4: true };

describe('AuthStatePanel states', () => {
  it.each<AuthState>(['notVerified', 'inProgress', 'verified', 'partial', 'failed', 'callerChanged'])(
    '%s shows icon + text status and is axe clean',
    async (state) => {
      const { container } = render(<AuthStatePanel state={state} checks={none} callerType="veteran" onChange={vi.fn()} />);
      expect(screen.getByRole('heading', { name: 'Caller verification' })).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    },
  );

  it('default → in progress → verified only when all checks are confirmed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<AuthStatePanel state="notVerified" checks={none} callerType="veteran" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Start verification' }));
    expect(onChange).toHaveBeenLastCalledWith({ state: 'inProgress' });

    rerender(<AuthStatePanel state="inProgress" checks={none} callerType="veteran" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Mark verified' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Full name matches' }));
    expect(onChange).toHaveBeenLastCalledWith({ checks: { ...none, fullName: true } });

    rerender(<AuthStatePanel state="inProgress" checks={all} callerType="veteran" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Mark verified' }));
    expect(onChange).toHaveBeenLastCalledWith({ state: 'verified' });
  });

  it('partial: some checks allow "partially verified"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AuthStatePanel state="inProgress" checks={{ ...none, fullName: true }} callerType="veteran" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Mark partially verified' }));
    expect(onChange).toHaveBeenLastCalledWith({ state: 'partial' });
  });

  it('error (failed) explains what not to share; caller changed resets and offers re-verify', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<AuthStatePanel state="failed" checks={none} callerType="veteran" onChange={onChange} />);
    expect(screen.getByText(/don't share protected details/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Caller changed' }));
    expect(onChange).toHaveBeenLastCalledWith({ state: 'callerChanged', checks: none });
    rerender(<AuthStatePanel state="callerChanged" checks={none} callerType="veteran" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Verify new caller' }));
    expect(onChange).toHaveBeenLastCalledWith({ state: 'inProgress', checks: none });
  });

  it('success: verified by IVR says so', () => {
    render(<AuthStatePanel state="verified" verifiedBy="ivr" checks={none} callerType="veteran" onChange={vi.fn()} />);
    expect(screen.getByText(/verified by ivr/i)).toBeInTheDocument();
  });

  it('authorized representative: asks to confirm authority', () => {
    render(<AuthStatePanel state="notVerified" checks={none} callerType="authorizedRep" onChange={vi.fn()} />);
    expect(screen.getByText(/authorized representative/i)).toBeInTheDocument();
  });

  it('denied: no actions, denied copy', () => {
    render(<AuthStatePanel state="notVerified" checks={none} callerType="veteran" denied onChange={vi.fn()} />);
    expect(screen.getByText(/you don't have access to caller verification/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('loading: busy placeholder', () => {
    render(<AuthStatePanel state="notVerified" checks={none} callerType="veteran" loading onChange={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Caller verification' })).toHaveAttribute('aria-busy', 'true');
  });
});
