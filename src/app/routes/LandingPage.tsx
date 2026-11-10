import { strings } from '@/content/strings';
import { ROLES } from '@/domain/roles';
import { useSession } from '../sessionStore';
import styles from './SimplePage.module.css';

/** Role-aware landing (F4) is built in M7. M0 shows the greeting and the landing mode. */
export function LandingPage() {
  const { displayName, roleId } = useSession();
  return (
    <div className={styles.page}>
      <h1 className={styles.greeting}>{strings.pages.landing.greeting(displayName)}</h1>
      <p className={styles.muted}>
        {ROLES[roleId].label} · {strings.placeholder.builtIn('M7')}
      </p>
    </div>
  );
}
