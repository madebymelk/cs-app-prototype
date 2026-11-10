import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { strings } from '@/content/strings';
import { CASE_SEARCH_ACCESS } from '@/config/navigation';
import { canAny } from '@/domain/permissions';
import { Search } from '@/design/icons';
import type { RoleId } from '@/domain/types';
import styles from './GlobalSearch.module.css';

/** Global search entry. Alt+Shift+S focuses it (docs/02). Results page is M6. */
export function GlobalSearch({ roleId }: { roleId: RoleId }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []);

  if (!canAny(roleId, CASE_SEARCH_ACCESS)) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    void navigate(query ? `/cases?q=${encodeURIComponent(query)}` : '/cases');
  };

  return (
    <form role="search" className={styles.form} onSubmit={onSubmit}>
      <label htmlFor="global-search" className="visually-hidden">
        {strings.search.label}
      </label>
      <input
        id="global-search"
        ref={inputRef}
        className={styles.input}
        type="search"
        value={q}
        placeholder={strings.search.placeholder}
        aria-keyshortcuts="Alt+Shift+S"
        onChange={(e) => { setQ(e.target.value); }}
      />
      <button type="submit" className={styles.submit} aria-label={strings.search.submit}>
        <Search size={16} aria-hidden />
      </button>
    </form>
  );
}
