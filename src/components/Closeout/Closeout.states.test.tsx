import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { validateClose } from '@/domain/closeValidation';
import { completeCase, makeCase } from '@/test/factories';
import { Closeout } from './Closeout';

const base = { showSummary: false, canAddCase: true, onChange: vi.fn(), onClose: vi.fn(), onAnotherCase: vi.fn() };

describe('Closeout states', () => {
  it('ready: complete case can close; script reads the case ID; axe clean', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const c = completeCase();
    const { container } = render(<Closeout {...base} c={c} issues={[]} onClose={onClose} />);
    expect(screen.getByText('Everything required is complete.')).toBeInTheDocument();
    expect(screen.getByText(`Your case number is ${c.id}. Please keep it for your records.`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close case' }));
    expect(onClose).toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('incomplete: counts missing items and lists the required escalation', () => {
    const c = completeCase({ finalReason: 'claimFiling', typeFields: { claimNumber: '1', claimType: 'medical' } });
    render(<Closeout {...base} c={c} issues={validateClose(c)} />);
    expect(screen.getByText('1 required item missing')).toBeInTheDocument();
    expect(screen.getByText(/send the required servicenow escalation/i)).toBeInTheDocument();
  });

  it('error: a failed close keeps the case open and shows the correlation ID', () => {
    render(<Closeout {...base} c={completeCase()} issues={[]} serverError={{ correlationId: 'COR-ABC-0001' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't be closed/i);
    expect(screen.getByText('COR-ABC-0001')).toBeInTheDocument();
  });

  it('success: closed case shows the ID inline with copy, offers another case', () => {
    const c = completeCase({ status: 'closed' });
    render(<Closeout {...base} c={c} issues={[]} />);
    expect(screen.getByText(`Case ${c.id} closed.`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close case' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create another case' })).toBeInTheDocument();
  });

  it('disposition errors show after a close attempt', () => {
    const c = makeCase({ status: 'open' });
    render(<Closeout {...base} c={c} issues={validateClose(c)} showSummary />);
    expect(screen.getByText('Choose disposition')).toBeInTheDocument();
  });
});
