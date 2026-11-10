import { NavLink } from 'react-router-dom';
import { strings } from '@/content/strings';
import { navFor } from '@/config/navigation';
import type { RoleId } from '@/domain/types';
import styles from './GlobalNav.module.css';

export function GlobalNav({ roleId }: { roleId: RoleId }) {
  return (
    <nav aria-label={strings.nav.label} className={styles.nav}>
      <ul className={styles.list}>
        {navFor(roleId).map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} end={item.end ?? false} className={styles.link}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
