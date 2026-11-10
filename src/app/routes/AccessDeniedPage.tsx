import { Link } from 'react-router-dom';
import { strings } from '@/content/strings';
import { Lock } from '@/design/icons';
import styles from './SimplePage.module.css';

export function AccessDeniedPage({ thing }: { thing: string }) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        <Lock size={24} aria-hidden /> {strings.pages.denied.title}
      </h1>
      <p>{strings.pages.denied.body(thing)}</p>
      <p>
        <Link to="/">{strings.pages.denied.home}</Link>
      </p>
    </div>
  );
}
