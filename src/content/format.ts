/** Dates per docs/04: "Nov 10, 2026 1:42 PM"; relative for <24h with the full timestamp available. */
const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatTime = (iso: string) => time.format(new Date(iso));

export function formatRelative(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - Date.parse(iso);
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${String(min)} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${String(hours)} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${String(days)} ${days === 1 ? 'day' : 'days'} ago`;
  return formatDateTime(iso);
}

/** Elapsed call time as m:ss / h:mm:ss with tabular digits. */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${String(h)}:${String(m).padStart(2, '0')}:${sec}` : `${String(m)}:${sec}`;
}

/** Calendar dates ("2026-10-02") as "Oct 2, 2026", without timezone drift. */
const dateOnly = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
export const formatDate = (ymd: string) => dateOnly.format(new Date(`${ymd.slice(0, 10)}T00:00:00Z`));
