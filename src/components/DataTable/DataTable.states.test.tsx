import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { usePrefs } from '@/app/prefsStore';
import { DataTable } from './DataTable';

type Row = { id: string; date: string };
const rows: Row[] = [{ id: 'A', date: '2026-01-01' }, { id: 'B', date: '2026-03-01' }, { id: 'C', date: '2026-02-01' }];
const columns = [
  { key: 'id', header: 'Number', render: (r: Row) => r.id },
  { key: 'date', header: 'Date', render: (r: Row) => r.date, sortValue: (r: Row) => r.date },
];
const firstCells = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0]?.textContent);

describe('DataTable', () => {
  it('newest first by default with aria-sort; axe clean', async () => {
    usePrefs.setState({ tableSort: {} });
    const { container } = render(<DataTable id="t1" caption="Referrals" columns={columns} rows={rows} rowKey={(r) => r.id} defaultSort={{ key: 'date', dir: 'desc' }} />);
    expect(firstCells()).toEqual(['B', 'C', 'A']);
    expect(screen.getByRole('columnheader', { name: /date/i })).toHaveAttribute('aria-sort', 'descending');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('toggles sort and remembers it per table', async () => {
    usePrefs.setState({ tableSort: {} });
    const user = userEvent.setup();
    render(<DataTable id="t2" caption="Claims" columns={columns} rows={rows} rowKey={(r) => r.id} defaultSort={{ key: 'date', dir: 'desc' }} />);
    await user.click(screen.getByRole('button', { name: /sort by date/i }));
    expect(firstCells()).toEqual(['A', 'C', 'B']);
    expect(usePrefs.getState().tableSort.t2).toEqual({ key: 'date', dir: 'asc' });
  });

  it('first cell opens the row for drill-down', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<DataTable id="t3" caption="Claims" columns={columns} rows={rows} rowKey={(r) => r.id} defaultSort={{ key: 'date', dir: 'desc' }} onOpen={onOpen} openLabel={(r) => `Open ${r.id}`} />);
    await user.click(screen.getByRole('button', { name: 'Open C' }));
    expect(onOpen).toHaveBeenCalledWith(rows[2]);
  });
});
