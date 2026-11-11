import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { caseAdapter } from '@/api/caseAdapter';
import { ApiError } from '@/api/client';
import { getScreenPop } from '@/api/interactionAdapter';
import { useSession } from '@/app/sessionStore';
import { useShortcuts } from '@/app/shortcuts';
import { usePermission } from '@/app/usePermission';
import { AuthStatePanel } from '@/components/AuthStatePanel/AuthStatePanel';
import { Button } from '@/components/Button/Button';
import { CaseForm } from '@/components/CaseForm/CaseForm';
import { CaseNavigator } from '@/components/CaseNavigator/CaseNavigator';
import { Closeout } from '@/components/Closeout/Closeout';
import { CopyButton } from '@/components/CopyButton/CopyButton';
import { Dialog, DialogActions } from '@/components/Dialog/Dialog';
import { ErrorSummary } from '@/components/ErrorSummary/ErrorSummary';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { InteractionHeader } from '@/components/InteractionHeader/InteractionHeader';
import { announce } from '@/components/LiveAnnouncer/announce';
import { SaveStatus } from '@/components/SaveStatus/SaveStatus';
import { CaseStatusBadge } from '@/components/StatusBadge/StatusBadge';
import { SLOW_LOAD_MS } from '@/config/closeout';
import { formatRelative } from '@/content/format';
import { strings } from '@/content/strings';
import { auditEvent, auditLog } from '@/domain/audit';
import { validateClose, type CloseIssue } from '@/domain/closeValidation';
import { findDuplicates } from '@/domain/duplicates';
import type { Case } from '@/domain/types';
import { veteranAdapter } from '@/api/veteranAdapter';
import { ContextChips } from '@/components/ContextChips/ContextChips';
import { ContextPanel } from '@/features/context/ContextPanel';
import { DownstreamSection } from '@/features/downstream/DownstreamSection';
import { addCase, associateProvider, cancelCase, closeCase, copyPrior, endInteraction, identifyVeteran } from './actions';
import { scheduleSave } from './autosave';
import { issueMessage, issueTarget } from './issues';
import { useInteractionCases } from './useInteractionCases';
import { useMediaQuery, WIDE_QUERY } from './useMediaQuery';
import { casesFor, DEFAULT_CONTEXT_NAV, useWorkspace, type ContextNav } from './workspaceStore';
import styles from './WorkspacePage.module.css';

const w = strings.workspace;
const s = strings.pages.interaction;
const MISSING_LABELS = { callerName: s.caller, initialReason: s.initialReason } as const;
const PRIOR_AGENT_NAMES: Record<string, string> = { 'AGT-11873': 'previous agent' };

function useSlow(active: boolean) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => { setSlow(true); }, SLOW_LOAD_MS);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [active]);
  return active && slow;
}

/** Live interaction workspace: regions B (header), C (cases), D (case + closeout), E (context). */
export function WorkspacePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { userId } = useSession();
  const canWork = usePermission('canWorkCases');
  const canCancel = usePermission('canCancelCase');
  const wide = useMediaQuery(WIDE_QUERY);

  const pop = useQuery({ queryKey: ['interaction', id], queryFn: ({ signal }) => getScreenPop(id, signal), retry: false });
  const interaction = pop.data?.interaction;
  const missing = pop.data?.missing ?? [];
  const slowPop = useSlow(pop.isPending);

  const casesState = useInteractionCases(interaction, canWork);
  const slowCases = useSlow(casesState.loading);
  const cases = useWorkspace(useShallow((st) => casesFor(st, id)));
  const activeId = useWorkspace((st) => st.active[id]);
  const active = cases.find((c) => c.id === activeId) ?? cases[0];
  const saveState = useWorkspace((st) => (active ? st.save[active.id] : undefined)) ?? { state: 'idle' as const };
  const auth = useWorkspace((st) => st.auth[id]);
  const contextOpenPref = useWorkspace((st) => st.contextOpen);
  const identified = useWorkspace((st) => st.veteranFor[id]);
  const veteranId = interaction?.caller.identifiers.veteranId ?? identified;
  const nav = useWorkspace((st) => st.contextNav[id]) ?? DEFAULT_CONTEXT_NAV;
  const onNav = (n: Partial<ContextNav>) => { useWorkspace.getState().setContextNav(id, n); };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const contextOpen = wide ? contextOpenPref : drawerOpen;

  const [attempted, setAttempted] = useState<Record<string, boolean>>({});
  const [serverIssues, setServerIssues] = useState<Record<string, CloseIssue[]>>({});
  const [serverError, setServerError] = useState<Record<string, { correlationId?: string } | undefined>>({});
  const [closing, setClosing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [endBlocked, setEndBlocked] = useState<string[] | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [viewDuplicate, setViewDuplicate] = useState<Case | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const caseHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusCaseOnChange = useRef(false);
  const pendingEnd = useRef(false);

  useEffect(() => {
    if (interaction) {
      useWorkspace.getState().initAuth(interaction);
      if (interaction.linkageStatus === 'failed') {
        auditLog.emit(auditEvent(userId, 'linkage.failed', { refIds: [interaction.id, interaction.contactId] }));
      }
    }
  }, [interaction, userId]);

  // Move focus to the case heading after add/switch (docs/06: focus the heading of what opened).
  useEffect(() => {
    if (focusCaseOnChange.current) {
      focusCaseOnChange.current = false;
      caseHeadingRef.current?.focus();
    }
  }, [active?.id]);

  const issues = useMemo(() => {
    if (!active) return [];
    return validateClose(active);
  }, [active]);
  const shownIssues = active ? (serverIssues[active.id] ?? issues) : [];

  // Duplicate check (◇ docs/03 F5): same caller + reason within decisions.duplicateWindowDays.
  const callerRef = active?.callerRef;
  const prior = useQuery({
    queryKey: ['callerCases', callerRef],
    queryFn: ({ signal }) => caseAdapter.listForCaller(callerRef ?? '', signal),
    enabled: Boolean(callerRef) && canWork,
    staleTime: 60_000,
  });
  const dismissed = useWorkspace((st) => (active ? Boolean(st.dismissedDuplicates[active.id]) : false));
  const duplicate =
    active && !dismissed && ['draft', 'open'].includes(active.status) && prior.data
      ? findDuplicates(active, prior.data, new Date())[0]
      : undefined;

  const priorQuery = useQuery({
    queryKey: ['records', veteranId, 'cases'],
    queryFn: ({ signal }) => veteranAdapter.priorCases(veteranId ?? '', signal),
    enabled: Boolean(veteranId) && canWork,
    retry: false,
  });
  const priorCases = veteranId ? (priorQuery.data?.items.filter((c) => c.interactionId !== id) ?? []) : undefined;

  const openPrior = (caseId: string) => {
    onNav({ top: 'veteran', tab: 'cases', detail: { kind: 'cases', id: caseId } });
    if (wide) useWorkspace.getState().setContextOpen(true);
    else setDrawerOpen(true);
  };

  const select = (caseId: string) => {
    focusCaseOnChange.current = true;
    useWorkspace.getState().setActive(id, caseId);
    announce(w.navigator.switched(caseId));
  };

  const onAdd = async () => {
    if (!interaction || adding) return;
    setAdding(true);
    try {
      focusCaseOnChange.current = true;
      const c = await addCase(interaction);
      announce(w.navigator.added(c.id));
    } finally {
      setAdding(false);
    }
  };

  const onChange = (patch: Partial<Case>) => {
    if (!active) return;
    useWorkspace.getState().editCase(active.id, patch, userId, interaction?.initialReason);
    setServerIssues((m) => omit(m, active.id));
    scheduleSave(active.id, userId);
  };

  const onClose = async () => {
    if (!active || closing) return;
    setAttempted((a) => ({ ...a, [active.id]: true }));
    setServerError((m) => ({ ...m, [active.id]: undefined }));
    setClosing(true);
    const r = await closeCase(active.id);
    setClosing(false);
    if (r.ok) {
      announce(w.closeout.closed(r.case.id));
      return;
    }
    if ('issues' in r) {
      setServerIssues((m) => ({ ...m, [active.id]: r.issues }));
      requestAnimationFrame(() => summaryRef.current?.focus());
    } else if (r.error.code === 'serverError') {
      const correlationId = r.error.correlationId;
      setServerError((m) => ({ ...m, [active.id]: correlationId ? { correlationId } : {} }));
    }
  };

  const onEnd = async () => {
    if (!interaction) {
      // Still loading the screen pop: end as soon as it arrives instead of dropping the request.
      pendingEnd.current = true;
      return;
    }
    const r = await endInteraction(interaction);
    if (r.ok) {
      announce(w.end.ended);
      void navigate('/');
    } else {
      setEndBlocked(r.openCaseIds);
    }
  };

  const toggleContext = () => {
    if (wide) useWorkspace.getState().setContextOpen(!contextOpenPref);
    else setDrawerOpen((o) => !o);
  };

  useShortcuts({
    'Alt+Shift+N': () => { if (canWork) void onAdd(); },
    'Alt+Shift+C': toggleContext,
    'Alt+Shift+E': () => { if (active && canWork && !['closed', 'discarded', 'canceled'].includes(active.status)) setEscalating(true); },
    'Ctrl+Enter': () => { if (active && canWork && active.status !== 'closed') void onClose(); },
    ...Object.fromEntries(
      cases.slice(0, 9).map((c, i) => [`Alt+Shift+${String(i + 1)}`, () => { select(c.id); }]),
    ),
  });

  useEffect(() => {
    if (interaction && pendingEnd.current) {
      pendingEnd.current = false;
      void onEnd();
    }
  });

  // The Dev Toolbar's "End interaction" goes through the same rules.
  useEffect(() => {
    const handler = () => void onEnd();
    window.addEventListener('cs:end-interaction', handler);
    return () => { window.removeEventListener('cs:end-interaction', handler); };
  });

  if (pop.isError) {
    return (
      <div className={styles.page}>
        <InteractionHeader />
        <div className={styles.full}>
          <InlineAlert tone="error" title={s.failed}>
            <p>
              {s.correlation}:{' '}
              <span className="mono">{pop.error instanceof ApiError ? (pop.error.correlationId ?? '—') : '—'}</span>
            </p>
            <p>
              <Link to="/cases">{s.failedAction}</Link>
            </p>
          </InlineAlert>
        </div>
      </div>
    );
  }

  const readOnly = !canWork || !active || ['closed', 'discarded', 'canceled'].includes(active.status);

  return (
    <div className={`${styles.page} ${wide ? styles.wide : styles.narrow} ${contextOpen ? '' : styles.contextClosed}`}>
      <InteractionHeader
        interaction={interaction}
        loading={pop.isPending}
        authState={auth?.state}
        activeCase={active}
        cases={cases}
        narrow={!wide}
        contextOpen={contextOpen}
        onToggleContext={toggleContext}
        contextId="context"
        onSwitchCase={select}
        {...(canWork ? { onEnd: () => void onEnd() } : {})}
      />

      {wide ? (
        <div className={styles.cases}>
          <CaseNavigator
            cases={cases}
            activeId={active?.id}
            currentUserId={userId}
            ownerNames={PRIOR_AGENT_NAMES}
            canAdd={canWork && Boolean(interaction)}
            adding={adding}
            error={casesState.error ? w.loadError : undefined}
            onSelect={select}
            onAdd={() => void onAdd()}
            priorCases={priorCases}
            onOpenPrior={openPrior}
          />
        </div>
      ) : null}

      <section id="case" className={styles.case} aria-label={s.caseRegion} tabIndex={-1}>
        {slowPop ? <InlineAlert tone="info" title={w.stillLoading} /> : null}
        {missing.length > 0 ? (
          <InlineAlert tone="warning" title={s.partial(missing.map((m) => MISSING_LABELS[m]))} />
        ) : null}
        {interaction?.linkageStatus === 'failed' ? <InlineAlert tone="warning" title={w.banners.linkageFailed} /> : null}
        {interaction?.transferredFrom ? (
          <InlineAlert tone="info" title={w.banners.transferred(interaction.transferredFrom, interaction.caseIds.length)} />
        ) : null}

        {interaction && auth ? (
          <AuthStatePanel
            state={auth.state}
            checks={auth.checks}
            verifiedBy={auth.verifiedBy}
            callerType={interaction.caller.type}
            denied={!canWork}
            onChange={(next) => {
              useWorkspace.getState().setAuth(id, { ...next, ...(next.state === 'verified' ? { verifiedBy: 'agent' } : {}) });
              if (next.state) {
                auditLog.emit(auditEvent(userId, `auth.${next.state}`, { refIds: [id] }));
                announce(strings.authStates[next.state]);
              }
            }}
          />
        ) : (
          <AuthStatePanel state="notVerified" checks={{ fullName: false, dateOfBirth: false, ssnLast4: false }} callerType="veteran" loading onChange={() => undefined} />
        )}

        {!canWork ? (
          <InlineAlert tone="info" title={w.form.denied} />
        ) : casesState.error ? (
          <InlineAlert tone="error" title={w.loadError}>
            <Button compact onPress={casesState.retry}>{w.retry}</Button>
          </InlineAlert>
        ) : !active ? (
          <div className={styles.loading} aria-busy="true">
            <p>{slowCases ? w.stillLoading : w.loading}</p>
            {slowCases ? <Button compact onPress={casesState.retry}>{w.retry}</Button> : null}
          </div>
        ) : (
          <>
            {duplicate ? (
              <InlineAlert tone="warning" title={w.duplicate.title}>
                <p>{w.duplicate.body(duplicate.id, formatRelative(duplicate.createdAt))}</p>
                <div className={styles.inlineActions}>
                  <Button compact onPress={() => { useWorkspace.getState().dismissDuplicate(active.id); }}>
                    {w.duplicate.continue}
                  </Button>
                  <Button compact variant="quiet" onPress={() => { setViewDuplicate(duplicate); }}>
                    {w.duplicate.view}
                  </Button>
                </div>
              </InlineAlert>
            ) : null}

            <div className={styles.caseHead}>
              <h2 ref={caseHeadingRef} tabIndex={-1} className={styles.caseTitle}>
                {s.caseRegion}: <span className="mono">{active.id}</span>
              </h2>
              <CopyButton value={active.id} label={w.form.caseId} />
              <CaseStatusBadge status={active.status} />
              <SaveStatus state={saveState} />
              {active.status === 'open' ? (
                canCancel ? (
                  <Button compact variant="quiet" onPress={() => { setConfirmCancel(true); }}>
                    {w.form.cancelCase}
                  </Button>
                ) : null
              ) : null}
            </div>
            {readOnly && active.status !== 'closed' ? <p className={styles.muted}>{w.form.readOnly}</p> : null}
            <ContextChips linked={active.linked} />

            {attempted[active.id] && shownIssues.length > 0 && active.status !== 'closed' ? (
              <ErrorSummary
                ref={summaryRef}
                title={w.errors.summaryTitle(shownIssues.length)}
                items={shownIssues.map((i) => ({ targetId: issueTarget(active.id, i), message: issueMessage(i) }))}
              />
            ) : null}

            <CaseForm
              key={active.id}
              c={active}
              initialReason={interaction?.initialReason}
              issues={shownIssues}
              showAllErrors={Boolean(attempted[active.id])}
              readOnly={readOnly}
              onChange={onChange}
            />
            <DownstreamSection
              c={active}
              readOnly={readOnly}
              escalating={escalating}
              onEscalatingChange={setEscalating}
            />
            <Closeout
              c={active}
              issues={shownIssues}
              showSummary={Boolean(attempted[active.id])}
              closing={closing}
              serverError={serverError[active.id]}
              readOnly={readOnly}
              canAddCase={canWork}
              onChange={onChange}
              onClose={() => void onClose()}
              onAnotherCase={() => void onAdd()}
            />
          </>
        )}
      </section>

      <aside
        id="context"
        className={`${styles.context} ${!wide ? styles.drawer : ''}`}
        aria-label={s.contextRegion}
        tabIndex={-1}
        hidden={!contextOpen}
      >
        <div className={styles.contextHead}>
          <h2 className={styles.regionTitle}>{s.contextRegion}</h2>
          {!wide ? (
            <Button compact variant="quiet" onPress={() => { setDrawerOpen(false); }}>
              {w.header.hideContext}
            </Button>
          ) : null}
        </div>
        <ContextPanel
          interaction={interaction}
          veteranId={veteranId}
          activeCase={canWork ? active : undefined}
          nav={nav}
          onNav={onNav}
          onIdentify={(v) => {
            if (!interaction) return;
            identifyVeteran(interaction, v);
            announce(strings.context.identify.linked(`${v.firstName} ${v.lastName}`));
          }}
          onAssociateProvider={(pr) => {
            if (!active) return;
            if (associateProvider(active.id, pr, interaction?.initialReason)) {
              announce(strings.context.provider.associatedAnnounce(pr.name, active.id));
            }
          }}
          onCopy={(prior, selection) => (active ? copyPrior(active.id, prior, selection, interaction?.initialReason) : 0)}
        />
      </aside>

      <Dialog isOpen={endBlocked !== null} onOpenChange={(o) => { if (!o) setEndBlocked(null); }} title={w.end.blockedTitle}>
        <p>{w.end.blockedBody}</p>
        <ul className={styles.openList}>
          {(endBlocked ?? []).map((cid) => {
            const c = cases.find((x) => x.id === cid);
            return (
              <li key={cid}>
                <Button
                  variant="quiet"
                  compact
                  onPress={() => {
                    setEndBlocked(null);
                    select(cid);
                  }}
                >
                  {w.end.goTo(cid)}
                </Button>
                {c ? <CaseStatusBadge status={c.status} /> : null}
              </li>
            );
          })}
        </ul>
        <DialogActions>
          <Button variant="primary" onPress={() => { setEndBlocked(null); }}>
            {w.end.keepWorking}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        isOpen={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={active ? w.cancelDialog.title(active.id) : ''}
        role="alertdialog"
      >
        <p>{w.cancelDialog.body}</p>
        <DialogActions>
          <Button
            variant="danger"
            onPress={() => {
              setConfirmCancel(false);
              if (active) void cancelCase(active.id);
            }}
          >
            {w.cancelDialog.confirm}
          </Button>
          <Button onPress={() => { setConfirmCancel(false); }}>{w.cancelDialog.back}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        isOpen={viewDuplicate !== null}
        onOpenChange={(o) => { if (!o) setViewDuplicate(null); }}
        title={viewDuplicate ? w.duplicate.dialogTitle(viewDuplicate.id) : ''}
      >
        {viewDuplicate ? (
          <dl className={styles.summary}>
            <dt>{strings.workspace.form.finalReason}</dt>
            <dd>{viewDuplicate.finalReason && viewDuplicate.finalReason in strings.callReasons ? strings.callReasons[viewDuplicate.finalReason as keyof typeof strings.callReasons] : '—'}</dd>
            <dt>{strings.workspace.navigator.title}</dt>
            <dd><CaseStatusBadge status={viewDuplicate.status} /></dd>
            <dt>{strings.workspace.form.notes}</dt>
            <dd>{viewDuplicate.notes}</dd>
          </dl>
        ) : null}
        <DialogActions>
          <Button onPress={() => { setViewDuplicate(null); }}>{w.duplicate.close}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function omit<T>(m: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _drop, ...rest } = m;
  return rest;
}
