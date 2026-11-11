import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { completeCase, makeCase } from '@/test/factories';
import { PriorCaseView } from './PriorCaseView';

const prior = completeCase({ id: 'CS-2026-000777', status: 'closed', notes: 'Earlier call about a denied claim.' });

describe('PriorCaseView', () => {
  it('read-only prior case with selective copy; axe clean', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn().mockReturnValue(1);
    const { container } = render(<PriorCaseView prior={prior} activeCase={makeCase({ id: 'CS-ACTIVE' })} onCopy={onCopy} />);
    expect(screen.getByText('Earlier call about a denied claim.')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Notes' }));
    await user.click(screen.getByRole('button', { name: 'Copy to active case' }));
    expect(onCopy).toHaveBeenCalledWith(prior, { notes: true });
    expect(screen.getByText('Copied 1 item into CS-ACTIVE.')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('nothing selected explains why nothing copied', async () => {
    const user = userEvent.setup();
    render(<PriorCaseView prior={prior} activeCase={makeCase()} onCopy={vi.fn().mockReturnValue(0)} />);
    await user.click(screen.getByRole('button', { name: 'Copy to active case' }));
    expect(screen.getByText('Choose at least one item that has content to copy.')).toBeInTheDocument();
  });

  it('no open active case: no copy controls', () => {
    render(<PriorCaseView prior={prior} activeCase={completeCase({ status: 'closed' })} onCopy={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Copy to active case' })).not.toBeInTheDocument();
    expect(screen.getByText('Open a case in this interaction to copy into it.')).toBeInTheDocument();
  });
});
