import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '@/api/client';
import { SLOW_LOAD_MS } from '@/config/closeout';
import { formatRelative } from '@/content/format';
import { strings } from '@/content/strings';
import { isStale } from '@/domain/freshness';
import { Button } from '../Button/Button';
import { InlineAlert } from '../InlineAlert/InlineAlert';
import styles from './SourceSection.module.css';

const t = strings.source;

/**
 * One authoritative source, rendered with every state docs/04 asks for: loading skeleton, still loading
 * (>10s, stop/retry), stopped, source down (names the source, correlation ID, retry), denied, empty
 * (only when the source answered with zero) and stale (refresh). Other sources are unaffected.
 */
export function SourceSection<T>({
  source,
  query,
  queryKey,
  isEmpty,
  emptyText,
  deniedThing,
  updatedAt,
  skeletonRows = 3,
  children,
}: {
  source: string;
  query: UseQueryResult<T>;
  queryKey: readonly unknown[];
  isEmpty?: (data: T) => boolean;
  emptyText?: string;
  deniedThing?: string;
  updatedAt?: (data: T) => string | undefined;
  skeletonRows?: number;
  children: (data: T) => ReactNode;
}) {
  const client = useQueryClient();
  const [slow, setSlow] = useState(false);
  const [stopped, setStopped] = useState(false);
  const fetching = query.fetchStatus === 'fetching' && query.data === undefined;

  useEffect(() => {
    if (!fetching) return;
    const id = setTimeout(() => { setSlow(true); }, SLOW_LOAD_MS);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [fetching]);

  const retry = () => {
    setStopped(false);
    void query.refetch();
  };

  if (stopped && query.data === undefined) {
    return (
      <InlineAlert tone="info" title={t.canceled(source)}>
        <Button compact onPress={retry}>{t.retry}</Button>
      </InlineAlert>
    );
  }

  if (query.isError) {
    const err = query.error;
    if (err instanceof ApiError && err.status === 403) {
      return <InlineAlert tone="info" title={t.denied(deniedThing ?? source)} />;
    }
    return (
      <div className={styles.down} role="status">
        <InlineAlert tone="warning" title={t.down(source)}>
          {err instanceof ApiError && err.correlationId ? (
            <p>
              {strings.pages.interaction.correlation}: <span className="mono">{err.correlationId}</span>
            </p>
          ) : null}
          <Button compact onPress={retry}>{t.retry}</Button>
        </InlineAlert>
      </div>
    );
  }

  if (query.data === undefined) {
    return (
      <div className={styles.loading} aria-busy="true" aria-label={t.loading(source)}>
        {slow ? (
          <InlineAlert tone="info" title={t.stillLoading(source)}>
            <div className={styles.actions}>
              <Button
                compact
                onPress={() => {
                  void client.cancelQueries({ queryKey: [...queryKey] });
                  setStopped(true);
                }}
              >
                {t.cancel}
              </Button>
              <Button compact variant="quiet" onPress={retry}>{t.retry}</Button>
            </div>
          </InlineAlert>
        ) : null}
        {Array.from({ length: skeletonRows }, (_, i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  const data = query.data;
  const at = updatedAt?.(data);
  const stale = isStale(at, new Date());
  return (
    <div className={styles.section}>
      {stale && at ? (
        <InlineAlert tone="info" title={t.stale(formatRelative(at))}>
          <Button compact onPress={retry}>{t.refresh}</Button>
        </InlineAlert>
      ) : null}
      {isEmpty?.(data) ? <p className={styles.empty}>{emptyText}</p> : children(data)}
    </div>
  );
}
