import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Keyboard shortcuts (docs/02). Alt+Shift chords avoid common screen-reader keys; matched on
 * `event.code` so layouts and macOS Option characters don't break them.
 */
export type ShortcutMap = Partial<Record<string, (e: KeyboardEvent) => void>>;

export function chordOf(e: KeyboardEvent): string | undefined {
  if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) return `Alt+Shift+${e.code.replace(/^(Key|Digit)/, '')}`;
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === 'Enter') return 'Ctrl+Enter';
  return undefined;
}

export function useShortcuts(map: ShortcutMap) {
  const ref = useRef(map);
  useLayoutEffect(() => {
    ref.current = map;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const chord = chordOf(e);
      const handler = chord ? ref.current[chord] : undefined;
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []);
}
