import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { validateClose } from '@/domain/closeValidation';
import { completeCase, makeCase } from '@/test/factories';
import { CaseForm } from './CaseForm';

describe('CaseForm states', () => {
  it('default: sections, IVR reason read-only, workgroup by rule; axe clean', async () => {
    const c = makeCase({ finalReason: 'referralVerification', caseType: 'referral', workgroup: { id: 'WG-REFERRALS', assignedBy: 'rule' } });
    const { container } = render(<CaseForm c={c} initialReason="referralVerification" issues={[]} showAllErrors={false} onChange={vi.fn()} />);
    for (const name of ['Caller', 'Reason', 'Case details', 'Notes']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('Initial reason (IVR)')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /final reason/i })).toHaveValue('referralVerification');
    expect(screen.getByText('Referrals')).toBeInTheDocument();
    expect(screen.getByText(/assigned by rule/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /referral number/i })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('empty: no reason yet asks for one before showing details', () => {
    render(<CaseForm c={makeCase()} issues={[]} showAllErrors={false} onChange={vi.fn()} />);
    expect(screen.getByText(/choose a final reason to see the details/i)).toBeInTheDocument();
    expect(screen.getByText('Not provided by IVR')).toBeInTheDocument();
  });

  it('progressive validation: errors only after blur, then all after a close attempt', async () => {
    const user = userEvent.setup();
    const c = makeCase({ status: 'open', finalReason: 'referralVerification', caseType: 'referral' });
    const issues = validateClose(c);
    const { rerender } = render(<CaseForm c={c} issues={issues} showAllErrors={false} onChange={vi.fn()} />);
    expect(screen.queryByText('Enter notes')).not.toBeInTheDocument();
    await user.click(screen.getByRole('textbox', { name: /^notes/i }));
    await user.tab();
    expect(screen.getByText('Enter notes')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^notes/i })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Enter referral number')).not.toBeInTheDocument();

    rerender(<CaseForm c={c} issues={issues} showAllErrors onChange={vi.fn()} />);
    expect(screen.getByText('Enter referral number')).toBeInTheDocument();
    expect(screen.getByText('Choose repeat contact')).toBeInTheDocument();
  });

  it('edits report patches: reason, notes, repeat contact, manual workgroup', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CaseForm c={makeCase({ finalReason: 'escalationFollowUp', caseType: 'general' })} issues={[]} showAllErrors={false} onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: /final reason/i }), 'claimFiling');
    expect(onChange).toHaveBeenLastCalledWith({ finalReason: 'claimFiling' });
    expect(screen.getByText(/no routing rule/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: /workgroup/i }), 'WG-ESCALATIONS');
    expect(onChange).toHaveBeenLastCalledWith({ workgroup: { id: 'WG-ESCALATIONS', assignedBy: 'manual' } });
    await user.click(screen.getByRole('radio', { name: 'No' }));
    expect(onChange).toHaveBeenLastCalledWith({ repeatContact: false });
    await user.type(screen.getByRole('textbox', { name: /^notes/i }), 'x');
    expect(onChange).toHaveBeenLastCalledWith({ notes: 'x' });
  });

  it('manual override of a rule-assigned workgroup, and back to the rule', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const ruled = completeCase();
    const { rerender } = render(<CaseForm c={ruled} issues={[]} showAllErrors={false} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Change workgroup' }));
    expect(screen.getByRole('combobox', { name: /workgroup/i })).toBeInTheDocument();
    rerender(<CaseForm c={{ ...ruled, workgroup: { id: 'WG-CLAIMS', assignedBy: 'manual' } }} issues={[]} showAllErrors={false} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Use rule' }));
    expect(onChange).toHaveBeenLastCalledWith({ workgroup: { id: 'WG-REFERRALS', assignedBy: 'rule' } });
  });

  it('read-only (closed) and denied: controls disabled, still axe clean', async () => {
    const { container } = render(<CaseForm c={completeCase({ status: 'closed' })} issues={[]} showAllErrors={false} readOnly onChange={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: /^notes/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Change workgroup' })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
