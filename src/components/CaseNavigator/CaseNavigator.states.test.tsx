import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { completeCase, makeCase } from '@/test/factories';
import { CaseNavigator } from './CaseNavigator';

const cases = [
  makeCase({ id: 'CS-2026-000001', finalReason: 'referralVerification' }),
  completeCase({ id: 'CS-2026-000002', status: 'closed' }),
  completeCase({ id: 'CS-2026-000003', ownerId: 'AGT-11873' }),
];

describe('CaseNavigator states', () => {
  it('default: lists cases with status text, marks the active one; axe clean', async () => {
    const { container } = render(
      <CaseNavigator cases={cases} activeId="CS-2026-000001" currentUserId="AGT-20417" canAdd onSelect={vi.fn()} onAdd={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /CS-2026-000001/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText(/started by AGT-11873/i)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('switches and adds cases', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onAdd = vi.fn();
    render(<CaseNavigator cases={cases} activeId="CS-2026-000001" currentUserId="AGT-20417" canAdd onSelect={onSelect} onAdd={onAdd} />);
    await user.click(screen.getByRole('button', { name: /CS-2026-000002/ }));
    expect(onSelect).toHaveBeenCalledWith('CS-2026-000002');
    await user.click(screen.getByRole('button', { name: 'Add case' }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('empty: explains and offers the next action', () => {
    render(<CaseNavigator cases={[]} currentUserId="A" canAdd onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByText('No cases yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add case' })).toBeInTheDocument();
  });

  it('error: shows the error in place', () => {
    render(<CaseNavigator cases={[]} currentUserId="A" canAdd error="Cases couldn't be loaded." onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent("Cases couldn't be loaded.");
  });

  it('confirm/success: adding disables the button until the case exists; no add without permission', () => {
    const { rerender } = render(<CaseNavigator cases={cases} currentUserId="A" canAdd adding onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Add case' })).toBeDisabled();
    rerender(<CaseNavigator cases={cases} currentUserId="A" canAdd={false} onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Add case' })).not.toBeInTheDocument();
  });
});
