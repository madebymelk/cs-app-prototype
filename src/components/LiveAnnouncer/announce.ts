/**
 * Polite announcements (docs/06: agents hear caller and screen reader in one headset).
 * Batches messages within a short window; never used for timers.
 */
type Listener = (message: string) => void;
const listeners = new Set<Listener>();
let pending: string[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

export function announce(message: string) {
  pending.push(message);
  clearTimeout(timer);
  timer = setTimeout(() => {
    const text = pending.join('. ');
    pending = [];
    listeners.forEach((l) => { l(text); });
  }, 250);
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
