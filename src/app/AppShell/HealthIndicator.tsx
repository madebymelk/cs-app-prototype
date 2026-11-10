import { useQuery } from '@tanstack/react-query';
import { getHealth } from '@/api/interactionAdapter';
import { strings } from '@/content/strings';
import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert } from '@/design/icons';
import styles from './HealthIndicator.module.css';

/** System health: healthy / degraded (names the source) / outage. Icon + text, never color alone. */
export function HealthIndicator() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval: 15_000,
  });

  let Icon = CircleHelp;
  let text: string = strings.health.unknown;
  let tone = styles.unknown;
  if (data?.status === 'healthy') {
    Icon = CircleCheck;
    text = strings.health.healthyShort;
    tone = styles.healthy;
  } else if (data?.status === 'degraded') {
    Icon = TriangleAlert;
    text = strings.health.degraded(data.sources);
    tone = styles.degraded;
  } else if (data?.status === 'outage') {
    Icon = CircleAlert;
    text = strings.health.outage(data.sources);
    tone = styles.outage;
  } else if (!isError) {
    text = '';
  }

  return (
    <div className={`${styles.health} ${tone ?? ''}`} role="status" aria-live="polite">
      {text ? (
        <>
          <Icon size={16} aria-hidden className={styles.icon} />
          <span>{text}</span>
        </>
      ) : null}
    </div>
  );
}
