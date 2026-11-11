import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { strings } from '@/content/strings';
import { DEFAULT_CONTEXT_NAV, type ContextNav } from '@/features/workspace/workspaceStore';
import { ProviderDetail } from './ProviderPanel';
import { RecordsTabs } from './RecordsTabs';
import { VeteranProfile } from './VeteranProfile';
import styles from './ProfilePages.module.css';

/** New-window Veteran view (docs/03 routes). Read-only; it never touches the active case. */
export function VeteranProfilePage() {
  const { id = '' } = useParams();
  const [nav, setNav] = useState<ContextNav>(DEFAULT_CONTEXT_NAV);
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{strings.pages.veteran.title}</h1>
      <VeteranProfile veteranId={id} headingLevel={2} />
      <RecordsTabs veteranId={id} nav={nav} onNav={(n) => { setNav((s) => ({ ...s, ...n })); }} />
    </div>
  );
}

export function ProviderProfilePage() {
  const { id = '' } = useParams();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{strings.pages.provider.title}</h1>
      <ProviderDetail id={id} />
    </div>
  );
}
