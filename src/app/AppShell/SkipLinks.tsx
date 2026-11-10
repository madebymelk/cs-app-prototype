import { strings } from '@/content/strings';
import styles from './SkipLinks.module.css';

/** Skip links (docs/06): main content everywhere; interaction regions in the live workspace. */
export function SkipLinks({ inInteraction }: { inInteraction: boolean }) {
  const links = inInteraction
    ? [
        { href: '#interaction', label: strings.skipLinks.interaction },
        { href: '#case', label: strings.skipLinks.case },
        { href: '#context', label: strings.skipLinks.context },
      ]
    : [{ href: '#main', label: strings.skipLinks.main }];
  return (
    <div className={styles.skip}>
      {links.map((l) => (
        <a key={l.href} href={l.href} className={styles.link}>
          {l.label}
        </a>
      ))}
    </div>
  );
}
