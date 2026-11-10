import { useEffect, useState } from 'react';
import { subscribe } from './announce';

/** Single polite live region for the app. Mount once in the shell. */
export function LiveAnnouncer() {
  const [message, setMessage] = useState('');
  useEffect(() => subscribe(setMessage), []);
  return (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true" data-testid="live-announcer">
      {message}
    </div>
  );
}
