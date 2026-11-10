import { Link } from 'react-router-dom';
import { strings } from '@/content/strings';
import styles from './SimplePage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{strings.pages.notFound.title}</h1>
      <p>{strings.pages.notFound.body}</p>
      <p>
        <Link to="/">{strings.pages.notFound.home}</Link>
      </p>
    </div>
  );
}
