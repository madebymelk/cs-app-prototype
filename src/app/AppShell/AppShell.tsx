import { Outlet, useMatch } from 'react-router-dom';
import { strings } from '@/content/strings';
import { ROLES } from '@/domain/roles';
import { LiveAnnouncer } from '@/components/LiveAnnouncer/LiveAnnouncer';
import { FlaskConical } from '@/design/icons';
import { DevToolbar, devToolbarEnabled } from '@/dev/DevToolbar/DevToolbar';
import { useSession } from '../sessionStore';
import { GlobalNav } from './GlobalNav';
import { GlobalSearch } from './GlobalSearch';
import { HealthIndicator } from './HealthIndicator';
import { ShellActions } from './ShellActions';
import { SkipLinks } from './SkipLinks';
import styles from './AppShell.module.css';

/** Region A: global shell (48px). Persistent across every route. */
export function AppShell() {
  const roleId = useSession((s) => s.roleId);
  const inInteraction = useMatch('/interaction/:id') !== null;

  return (
    <div className={styles.shell}>
      <SkipLinks inInteraction={inInteraction} />
      <header className={styles.bar}>
        <a className={styles.brand} href="/">
          {strings.app.name}
        </a>
        <GlobalNav roleId={roleId} />
        <div className={styles.spacer} />
        <GlobalSearch roleId={roleId} />
        <HealthIndicator />
        <ShellActions />
      </header>
      {ROLES[roleId].trainingBanner ? (
        <div className={styles.training} role="note">
          <FlaskConical size={16} aria-hidden />
          {strings.app.trainingBanner}
        </div>
      ) : null}
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <LiveAnnouncer />
      {devToolbarEnabled ? <DevToolbar /> : null}
    </div>
  );
}
