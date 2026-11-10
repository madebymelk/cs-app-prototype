import { Button, Dialog, DialogTrigger, Heading, Popover } from 'react-aria-components';
import { strings } from '@/content/strings';
import { ROLES } from '@/domain/roles';
import { Bell, CircleHelp, UserRound } from '@/design/icons';
import { useSession } from '../sessionStore';
import styles from './ShellActions.module.css';

/** Notifications, help and user/role. Content grows in M7 (needs attention) and M10 (shortcuts). */
export function ShellActions() {
  const { displayName, roleId, userId } = useSession();
  const role = ROLES[roleId];
  return (
    <div className={styles.actions}>
      <DialogTrigger>
        <Button className={styles.iconButton} aria-label={strings.shellActions.notifications}>
          <Bell size={20} aria-hidden />
        </Button>
        <Popover className={styles.popover} placement="bottom end">
          <Dialog className={styles.dialog}>
            <Heading slot="title" className={styles.heading}>
              {strings.shellActions.notifications}
            </Heading>
            <p>{strings.shellActions.notificationsEmpty}</p>
          </Dialog>
        </Popover>
      </DialogTrigger>
      <DialogTrigger>
        <Button className={styles.iconButton} aria-label={strings.shellActions.help}>
          <CircleHelp size={20} aria-hidden />
        </Button>
        <Popover className={styles.popover} placement="bottom end">
          <Dialog className={styles.dialog}>
            <Heading slot="title" className={styles.heading}>
              {strings.shellActions.help}
            </Heading>
            <p className={styles.muted}>{strings.placeholder.builtIn('M10')}</p>
          </Dialog>
        </Popover>
      </DialogTrigger>
      <DialogTrigger>
        <Button className={styles.userButton}>
          <UserRound size={20} aria-hidden />
          <span className={styles.userText}>
            <span>{displayName}</span>
            <span>{role.label}</span>
          </span>
        </Button>
        <Popover className={styles.popover} placement="bottom end">
          <Dialog className={styles.dialog}>
            <Heading slot="title" className={styles.heading}>
              {displayName}
            </Heading>
            <dl className={styles.meta}>
              <dt>{strings.shellActions.role}</dt>
              <dd>{role.label}</dd>
              <dt>{strings.shellActions.signedInAs}</dt>
              <dd className="mono">{userId}</dd>
            </dl>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
  );
}
