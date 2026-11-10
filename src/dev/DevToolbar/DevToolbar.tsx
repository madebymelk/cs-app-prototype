import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';
import {
  Button,
  Header,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Select,
  SelectValue,
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from 'react-aria-components';
import { useMatch, useNavigate } from 'react-router-dom';
import { useSession } from '@/app/sessionStore';
import { announce } from '@/components/LiveAnnouncer/announce';
import { strings } from '@/content/strings';
import { MessageSquare, Phone, PhoneOff, RotateCcw, X } from '@/design/icons';
import { ROLE_IDS, ROLES, isRoleId } from '@/domain/roles';
import type { Channel } from '@/domain/types';
import { mockDb } from '@/mocks/db';
import { useDevStore } from '../devStore';
import { SCENARIO_GROUPS, SCENARIOS, getScenario, isScenarioId } from '../scenarios';
import styles from './DevToolbar.module.css';

const t = strings.devToolbar;

export const devToolbarEnabled = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLBAR === 'true';

/**
 * Prototype control surface (not product UI): role, scenario, simulate call, end interaction, latency.
 * Collapsed pill bottom-left; Alt+Shift+D toggles. State persists in sessionStorage.
 */
export function DevToolbar() {
  const { scenario, latencyMs, toolbarOpen, setScenario, setLatency, setToolbarOpen } = useDevStore();
  const { roleId, setRole } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const interactionMatch = useMatch('/interaction/:id');
  const panelId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setToolbarOpen(!useDevStore.getState().toolbarOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [setToolbarOpen]);

  const simulate = (channel: Channel) => {
    const interaction = mockDb.createInteraction({ channel, scenario });
    announce(t.announceCall(strings.pages.interaction.channels[channel]));
    void navigate(`/interaction/${interaction.id}`);
  };

  const endInteraction = () => {
    const id = interactionMatch?.params.id;
    if (id) mockDb.endInteraction(id);
    void navigate('/');
  };

  return (
    <aside className={styles.root} aria-label={t.label} data-testid="dev-toolbar">
      {toolbarOpen ? (
        <div id={panelId} className={styles.panel}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>
              <span className={styles.badge}>{t.badge}</span> {t.label}
            </h2>
            <Button className={styles.iconButton} aria-label={t.close} onPress={() => { setToolbarOpen(false); }}>
              <X size={16} aria-hidden />
            </Button>
          </div>

          <Select
            className={styles.field}
            value={roleId}
            onChange={(key) => {
              if (isRoleId(key)) {
                setRole(key);
                announce(t.announceRole(ROLES[key].label));
              }
            }}
          >
            <Label className={styles.label}>{t.role}</Label>
            <Button className={styles.select}>
              <SelectValue />
              <span aria-hidden>▾</span>
            </Button>
            <Popover className={styles.popover}>
              <ListBox className={styles.listbox}>
                {ROLE_IDS.map((id) => (
                  <ListBoxItem key={id} id={id} className={styles.option}>
                    {ROLES[id].label}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>

          <Select
            className={styles.field}
            value={scenario}
            onChange={(key) => {
              if (isScenarioId(key)) {
                setScenario(key);
                void queryClient.invalidateQueries();
                announce(t.announceScenario(getScenario(key).label));
              }
            }}
          >
            <Label className={styles.label}>{t.scenario}</Label>
            <Button className={styles.select}>
              <SelectValue />
              <span aria-hidden>▾</span>
            </Button>
            <p slot="description" className={styles.description}>
              {getScenario(scenario).description}
            </p>
            <Popover className={styles.popover}>
              <ListBox className={styles.listbox}>
                {SCENARIO_GROUPS.map((group) => (
                  <ListBoxSection key={group} id={group}>
                    <Header className={styles.groupHeader}>{group}</Header>
                    {SCENARIOS.filter((sc) => sc.group === group).map((sc) => (
                      <ListBoxItem key={sc.id} id={sc.id} className={styles.option} textValue={sc.label}>
                        {sc.label}
                      </ListBoxItem>
                    ))}
                  </ListBoxSection>
                ))}
              </ListBox>
            </Popover>
          </Select>

          <fieldset className={styles.group}>
            <legend className={styles.label}>{t.simulate}</legend>
            <div className={styles.row}>
              <Button className={styles.button} onPress={() => { simulate('voice'); }}>
                <Phone size={16} aria-hidden />
                {t.simulateVoice}
              </Button>
              <Button className={styles.button} onPress={() => { simulate('chat'); }}>
                <MessageSquare size={16} aria-hidden />
                {t.simulateChat}
              </Button>
            </div>
          </fieldset>

          <Button className={styles.button} isDisabled={!interactionMatch} onPress={endInteraction}>
            <PhoneOff size={16} aria-hidden />
            {t.endInteraction}
          </Button>

          <Slider
            className={styles.slider}
            minValue={0}
            maxValue={5000}
            step={100}
            value={latencyMs}
            onChange={setLatency}
            isDisabled={scenario === 'slowSources'}
          >
            <div className={styles.sliderLabels}>
              <Label className={styles.label}>{t.latency}</Label>
              <SliderOutput className={styles.output}>{({ state }) => t.latencyValue(state.getThumbValue(0))}</SliderOutput>
            </div>
            <SliderTrack className={styles.track}>
              {({ state }) => (
                <>
                  <div className={styles.fill} style={{ width: `${String(state.getThumbPercent(0) * 100)}%` }} />
                  <SliderThumb className={styles.thumb} />
                </>
              )}
            </SliderTrack>
          </Slider>

          <Button
            className={styles.linkButton}
            onPress={() => {
              mockDb.reset();
              try {
                sessionStorage.clear();
              } catch {
                /* storage unavailable */
              }
              if (import.meta.env.VITE_DEMO === 'true') window.location.reload();
              else window.location.assign('/');
            }}
          >
            <RotateCcw size={16} aria-hidden />
            {t.reset}
          </Button>
        </div>
      ) : null}
      <Button
        className={styles.pill}
        aria-expanded={toolbarOpen}
        aria-controls={toolbarOpen ? panelId : undefined}
        aria-keyshortcuts="Alt+Shift+D"
        onPress={() => { setToolbarOpen(!toolbarOpen); }}
      >
        <span className={styles.badge}>{t.badge}</span>
        <span>
          {ROLES[roleId].label} · {getScenario(scenario).label}
        </span>
      </Button>
    </aside>
  );
}
