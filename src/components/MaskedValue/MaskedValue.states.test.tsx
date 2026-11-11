import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { MaskedValue } from './MaskedValue';

describe('MaskedValue', () => {
  it('masks by default and tells screen readers it is masked; axe clean', async () => {
    const { container } = render(<MaskedValue value="9999123456V654321" label="ICN" canReveal onReveal={vi.fn()} />);
    expect(screen.queryByText('9999123456V654321')).not.toBeInTheDocument();
    expect(screen.getByText(/masked, ending in/)).toBeInTheDocument();
    expect(screen.getByText('4321')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('reveal is a labelled button that audits each reveal (not each hide)', async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    render(<MaskedValue value="9999123456V654321" label="ICN" canReveal onReveal={onReveal} />);
    await user.click(screen.getByRole('button', { name: 'Reveal ICN' }));
    expect(screen.getByText('9999123456V654321')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hide ICN' }));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('denied: no reveal without permission', () => {
    render(<MaskedValue value="9999123456V654321" label="ICN" canReveal={false} onReveal={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
