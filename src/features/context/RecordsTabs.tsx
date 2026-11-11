import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { veteranAdapter } from '@/api/veteranAdapter';
import { SOURCE_NAMES } from '@/api/sources';
import { Button } from '@/components/Button/Button';
import { DataTable } from '@/components/DataTable/DataTable';
import { reasonLabel } from '@/components/InteractionHeader/InteractionHeader';
import { Facts, ReadOnlyBlock } from '@/components/ReadOnlyBlock/ReadOnlyBlock';
import { SourceSection } from '@/components/SourceSection/SourceSection';
import { CaseStatusBadge } from '@/components/StatusBadge/StatusBadge';
import { formatDateTime } from '@/content/format';
import { strings } from '@/content/strings';
import type { Case, RecordList } from '@/domain/types';
import { RECORD_KINDS, type RecordKind } from '@/mocks/records';
import type { ContextNav } from '@/features/workspace/workspaceStore';
import { PriorCaseView } from './PriorCaseView';
import { RECORD_DEFS } from './recordDefs';
import styles from './context.module.css';

const r = strings.context.records;
const openId = (kind: string, id: string) => `open-${kind}-${id}`;

export interface RecordsTabsProps {
  veteranId: string;
  nav: ContextNav;
  onNav: (nav: Partial<ContextNav>) => void;
  /** Prior cases from this interaction are excluded from the Cases tab. */
  excludeInteractionId?: string | undefined;
  activeCase?: Case | undefined;
  onCopy?: ((prior: Case, selection: import('@/domain/priorCopy').CopySelection) => number) | undefined;
}

/** Records tabs (F7): each tab is its own source with its own states; drill-down opens in place. */
export function RecordsTabs({ veteranId, nav, onNav, excludeInteractionId, activeCase, onCopy }: RecordsTabsProps) {
  const kind = (RECORD_KINDS as readonly string[]).includes(nav.tab) ? (nav.tab as RecordKind) : 'referrals';
  return (
    <Tabs
      className={styles.tabs}
      selectedKey={kind}
      onSelectionChange={(k) => { onNav({ tab: String(k), detail: undefined }); }}
    >
      <TabList aria-label={r.label} className={styles.tabList}>
        {RECORD_KINDS.map((k) => (
          <Tab key={k} id={k} className={styles.tab}>
            {r.tabs[k]}
          </Tab>
        ))}
      </TabList>
      {RECORD_KINDS.map((k) => (
        <TabPanel key={k} id={k} className={styles.tabPanel}>
          {k === 'cases' ? (
            <PriorCasesTab
              veteranId={veteranId}
              nav={nav}
              onNav={onNav}
              excludeInteractionId={excludeInteractionId}
              activeCase={activeCase}
              onCopy={onCopy}
            />
          ) : (
            <RecordTab veteranId={veteranId} kind={k} nav={nav} onNav={onNav} />
          )}
        </TabPanel>
      ))}
    </Tabs>
  );
}

/** After Back, return focus to the row that was opened (docs/06: on closing, return to the trigger). */
function useBackFocus(detailOpen: boolean, kind: string, lastId: React.RefObject<string | undefined>) {
  const prev = useRef(detailOpen);
  useEffect(() => {
    const id = lastId.current;
    if (prev.current && !detailOpen && id) document.getElementById(openId(kind, id))?.focus();
    prev.current = detailOpen;
  }, [detailOpen, kind, lastId]);
}

function RecordTab({ veteranId, kind, nav, onNav }: { veteranId: string; kind: Exclude<RecordKind, 'cases'>; nav: ContextNav; onNav: (n: Partial<ContextNav>) => void }) {
  const key = ['records', veteranId, kind] as const;
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => veteranAdapter.records<unknown>(veteranId, kind, signal), retry: false });
  const def = RECORD_DEFS[kind];
  const detail = nav.detail?.kind === kind ? nav.detail : undefined;
  const lastOpened = useRef<string | undefined>(undefined);
  useBackFocus(Boolean(detail), kind, lastOpened);
  const idOf = (row: unknown) => (row as { id: string }).id;

  return (
    <SourceSection
      source={SOURCE_NAMES[kind]}
      query={query}
      queryKey={key}
      isEmpty={(d: RecordList<unknown>) => d.items.length === 0}
      emptyText={r.empty[kind]}
      updatedAt={(d) => d.updatedAt}
    >
      {(d) => {
        const row = detail ? d.items.find((x) => idOf(x) === detail.id) : undefined;
        if (row) {
          return (
            <RecordDetail title={def.title(row)} back={r.tabs[kind]} source={d.source} updatedAt={d.updatedAt} onBack={() => { onNav({ detail: undefined }); }}>
              <Facts items={def.facts(row)} />
            </RecordDetail>
          );
        }
        return (
          <DataTable
            id={`records-${kind}`}
            caption={r.tabs[kind]}
            columns={def.columns}
            rows={d.items}
            rowKey={idOf}
            defaultSort={{ key: def.sortKey, dir: 'desc' }}
            openLabel={(x) => r.open(def.title(x))}
            onOpen={(x) => {
              lastOpened.current = idOf(x);
              onNav({ detail: { kind, id: idOf(x) } });
            }}
            rowButtonId={(x) => openId(kind, idOf(x))}
          />
        );
      }}
    </SourceSection>
  );
}

function PriorCasesTab({
  veteranId,
  nav,
  onNav,
  excludeInteractionId,
  activeCase,
  onCopy,
}: Omit<RecordsTabsProps, 'nav'> & { nav: ContextNav }) {
  const key = ['records', veteranId, 'cases'] as const;
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => veteranAdapter.priorCases(veteranId, signal), retry: false });
  const detail = nav.detail?.kind === 'cases' ? nav.detail : undefined;
  const lastOpened = useRef<string | undefined>(undefined);
  useBackFocus(Boolean(detail), 'cases', lastOpened);
  const prior = (d: RecordList<Case>) => d.items.filter((c) => c.interactionId !== excludeInteractionId);

  return (
    <SourceSection
      source={SOURCE_NAMES.cases}
      query={query}
      queryKey={key}
      isEmpty={(d) => prior(d).length === 0}
      emptyText={r.empty.cases}
    >
      {(d) => {
        const selected = detail ? prior(d).find((c) => c.id === detail.id) : undefined;
        if (selected) {
          return (
            <RecordDetail title={strings.context.prior.title(selected.id)} back={r.tabs.cases} source={d.source} updatedAt={d.updatedAt} onBack={() => { onNav({ detail: undefined }); }}>
              <PriorCaseView prior={selected} activeCase={activeCase} onCopy={onCopy} />
            </RecordDetail>
          );
        }
        return (
          <DataTable<Case>
            id="records-cases"
            caption={r.tabs.cases}
            rows={prior(d)}
            rowKey={(c) => c.id}
            defaultSort={{ key: 'created', dir: 'desc' }}
            openLabel={(c) => strings.context.prior.view(c.id)}
            onOpen={(c) => {
              lastOpened.current = c.id;
              onNav({ detail: { kind: 'cases', id: c.id } });
            }}
            rowButtonId={(c) => openId('cases', c.id)}
            columns={[
              { key: 'id', header: r.columns.caseId, render: (c) => <span className="mono">{c.id}</span> },
              { key: 'reason', header: r.columns.reason, render: (c) => reasonLabel(c.finalReason) ?? '—' },
              { key: 'status', header: r.columns.status, render: (c) => <CaseStatusBadge status={c.status} /> },
              { key: 'created', header: r.columns.created, render: (c) => formatDateTime(c.createdAt), sortValue: (c) => c.createdAt },
            ]}
          />
        );
      }}
    </SourceSection>
  );
}

function RecordDetail({
  title,
  back,
  source,
  updatedAt,
  onBack,
  children,
}: {
  title: string;
  back: string;
  source: string;
  updatedAt: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => { heading.current?.querySelector('h4')?.focus(); }, []);
  return (
    <div className={styles.stack} ref={heading}>
      <div>
        <Button compact variant="quiet" onPress={onBack}>{strings.context.back(back)}</Button>
      </div>
      <ReadOnlyBlock title={title} headingLevel={4} source={source} updatedAt={updatedAt}>
        {children}
      </ReadOnlyBlock>
    </div>
  );
}
