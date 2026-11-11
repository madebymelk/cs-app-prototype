import type { ReactNode } from 'react';
import { strings } from '@/content/strings';
import { usePrefs } from '@/app/prefsStore';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Value used for sorting; columns without one aren't sortable. */
  sortValue?: (row: T) => string | number;
}

/**
 * Compact table with real headers and aria-sort (docs/06). Newest first by default; the sort is
 * remembered per table for the session (docs/03 F1).
 */
export function DataTable<T>({
  id,
  caption,
  columns,
  rows,
  rowKey,
  defaultSort,
  onOpen,
  openLabel,
  rowButtonId,
}: {
  id: string;
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  defaultSort: { key: string; dir: 'asc' | 'desc' };
  onOpen?: (row: T) => void;
  openLabel?: (row: T) => string;
  /** DOM id for each row's open button, so focus can return there after drill-down. */
  rowButtonId?: (row: T) => string;
}) {
  const sort = usePrefs((s) => s.tableSort[id]) ?? defaultSort;
  const setSort = usePrefs((s) => s.setTableSort);
  const sortValue = columns.find((c) => c.key === sort.key)?.sortValue;
  const sorted = sortValue
    ? [...rows].sort((a, b) => {
        const av = sortValue(a);
        const bv = sortValue(b);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.dir === 'asc' ? cmp : -cmp;
      })
    : rows;

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = c.key === sort.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      className={styles.sort}
                      onClick={() => {
                        setSort(id, { key: c.key, dir: active && sort.dir === 'desc' ? 'asc' : 'desc' });
                      }}
                    >
                      {c.header}
                      <span aria-hidden className={styles.arrow}>{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
                      <span className="visually-hidden">{strings.context.records.sortBy(c.header)}</span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c, i) => (
                <td key={c.key}>
                  {i === 0 && onOpen ? (
                    <button
                      type="button"
                      id={rowButtonId?.(row)}
                      className={styles.open}
                      aria-label={openLabel?.(row)}
                      onClick={() => { onOpen(row); }}
                    >
                      {c.render(row)}
                    </button>
                  ) : (
                    c.render(row)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
