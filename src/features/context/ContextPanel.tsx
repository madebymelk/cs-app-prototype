import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { isDemoBuild } from '@/app/router';
import { strings } from '@/content/strings';
import type { CopySelection } from '@/domain/priorCopy';
import type { Case, Interaction, Provider, Veteran } from '@/domain/types';
import type { ContextNav } from '@/features/workspace/workspaceStore';
import { IdentifyVeteran } from './IdentifyVeteran';
import { ProviderPanel } from './ProviderPanel';
import { RecordsTabs } from './RecordsTabs';
import { VeteranProfile } from './VeteranProfile';
import styles from './context.module.css';

const t = strings.context;

export interface ContextPanelProps {
  interaction?: Interaction | undefined;
  veteranId?: string | undefined;
  activeCase?: Case | undefined;
  nav: ContextNav;
  onNav: (nav: Partial<ContextNav>) => void;
  onIdentify: (v: Veteran) => void;
  onAssociateProvider: (p: Provider) => void;
  onCopy: (prior: Case, selection: CopySelection) => number;
}

/** Region E: Veteran and provider context, read-only, inside the active case (docs/02, F7, F8). */
export function ContextPanel({ interaction, veteranId, activeCase, nav, onNav, onIdentify, onAssociateProvider, onCopy }: ContextPanelProps) {
  return (
    <Tabs
      className={styles.panel}
      selectedKey={nav.top}
      onSelectionChange={(k) => { onNav({ top: k === 'provider' ? 'provider' : 'veteran', detail: undefined }); }}
    >
      <TabList aria-label={t.title} className={styles.topTabs}>
        <Tab id="veteran" className={styles.topTab}>{t.veteranTab}</Tab>
        <Tab id="provider" className={styles.topTab}>{t.providerTab}</Tab>
      </TabList>
      <TabPanel id="veteran" className={styles.stack}>
        {veteranId ? (
          <>
            {!isDemoBuild ? (
              <a href={`/profiles/veteran/${veteranId}`} target="_blank" rel="noopener" className={styles.newWindow}>
                {t.openNewWindow}
              </a>
            ) : null}
            <VeteranProfile veteranId={veteranId} />
            <RecordsTabs
              veteranId={veteranId}
              nav={nav}
              onNav={onNav}
              excludeInteractionId={interaction?.id}
              activeCase={activeCase}
              onCopy={onCopy}
            />
          </>
        ) : interaction ? (
          <IdentifyVeteran callerName={interaction.caller.name} onSelect={onIdentify} />
        ) : null}
      </TabPanel>
      <TabPanel id="provider">
        <ProviderPanel nav={nav} onNav={onNav} activeCase={activeCase} onAssociate={onAssociateProvider} />
      </TabPanel>
    </Tabs>
  );
}
