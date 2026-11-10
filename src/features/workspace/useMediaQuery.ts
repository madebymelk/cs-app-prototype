import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => { m.removeEventListener('change', cb); };
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}

/** Full three-column workspace at ≥1280 CSS px (docs/02); below that, context becomes a drawer. */
export const WIDE_QUERY = '(min-width: 80rem)';
