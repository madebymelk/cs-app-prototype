import { useState } from 'react';
import { CALL_REASONS, CASE_TYPE_FIELDS, WORKGROUPS, type CaseTypeId } from '@/config/caseTypes';
import { strings } from '@/content/strings';
import { Lock } from '@/design/icons';
import type { CloseIssue } from '@/domain/closeValidation';
import { assignWorkgroup } from '@/domain/routing';
import type { Case, CallerType } from '@/domain/types';
import { errorFor, fieldId } from '@/features/workspace/issues';
import { Field, RadioField } from '../Field/Field';
import { reasonLabel } from '../InteractionHeader/InteractionHeader';
import styles from './CaseForm.module.css';

const f = strings.workspace.form;
const CALLER_TYPES = Object.keys(strings.callerTypes) as CallerType[];

export interface CaseFormProps {
  c: Case;
  initialReason?: string | undefined;
  issues: CloseIssue[];
  /** After a close attempt every error shows; before that only touched fields (progressive validation). */
  showAllErrors: boolean;
  readOnly?: boolean;
  onChange: (patch: Partial<Case>) => void;
}

/** Region D: guided intake for one case. CS-owned fields, editable; IVR reason shown read-only. */
export function CaseForm({ c, initialReason, issues, showAllErrors, readOnly, onChange }: CaseFormProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => () => { setTouched((t) => ({ ...t, [field]: true })); };
  const err = (field: string) => errorFor(issues, field, showAllErrors || Boolean(touched[field]));
  const id = (field: string) => fieldId(c.id, field);
  const caseType = c.caseType as CaseTypeId | undefined;
  const typeFields = caseType && caseType in CASE_TYPE_FIELDS ? CASE_TYPE_FIELDS[caseType].requiredFields : undefined;
  const ruleWorkgroup = assignWorkgroup({ finalReason: c.finalReason });
  const manual = c.workgroup?.assignedBy === 'manual';
  const [editingWorkgroup, setEditingWorkgroup] = useState(false);
  const showWorkgroupSelect = !c.workgroup || manual || editingWorkgroup;

  return (
    <div className={styles.form}>
      <section className={styles.section} aria-labelledby={`${c.id}-caller`}>
        <h3 id={`${c.id}-caller`} className={styles.sectionTitle}>{f.sections.caller}</h3>
        <div className={styles.grid}>
          <Field id={id('callerType')} label={f.callerType} required error={err('callerType')}>
            {(p) => (
              <select
                {...p}
                value={c.callerType}
                disabled={readOnly}
                onBlur={touch('callerType')}
                onChange={(e) => { onChange({ callerType: e.target.value as CallerType }); }}
              >
                {CALLER_TYPES.map((t) => (
                  <option key={t} value={t}>{strings.callerTypes[t]}</option>
                ))}
              </select>
            )}
          </Field>
          <Field id={id('callerFirstName')} label={f.callerFirstName} required error={err('callerFirstName')}>
            {(p) => (
              <input
                {...p}
                type="text"
                autoComplete="off"
                value={c.callerFirstName ?? ''}
                disabled={readOnly}
                onBlur={touch('callerFirstName')}
                onChange={(e) => { onChange({ callerFirstName: e.target.value }); }}
              />
            )}
          </Field>
        </div>
      </section>

      <section className={styles.section} aria-labelledby={`${c.id}-reason`}>
        <h3 id={`${c.id}-reason`} className={styles.sectionTitle}>{f.sections.reason}</h3>
        <div className={styles.readonly}>
          <span className={styles.readonlyLabel}>
            <Lock size={16} aria-hidden /> {f.initialReason}
          </span>
          <span>{reasonLabel(initialReason) ?? f.initialReasonNone}</span>
        </div>
        <div className={styles.grid}>
          <Field id={id('finalReason')} label={f.finalReason} hint={f.finalReasonHint} required error={err('finalReason')}>
            {(p) => (
              <select
                {...p}
                value={c.finalReason ?? ''}
                disabled={readOnly}
                onBlur={touch('finalReason')}
                onChange={(e) => { onChange({ finalReason: e.target.value || undefined }); }}
              >
                <option value="">{f.chooseOption}</option>
                {CALL_REASONS.map((r) => (
                  <option key={r} value={r}>{strings.callReasons[r]}</option>
                ))}
              </select>
            )}
          </Field>
          <div className={styles.workgroup}>
            {showWorkgroupSelect ? (
              <Field
                id={id('workgroup')}
                label={f.workgroup}
                hint={c.workgroup ? f.assignedManually : c.finalReason ? f.noRule : undefined}
                required
                error={err('workgroup')}
              >
                {(p) => (
                  <select
                    {...p}
                    value={c.workgroup?.id ?? ''}
                    disabled={readOnly}
                    onBlur={touch('workgroup')}
                    onChange={(e) => {
                      onChange(e.target.value ? { workgroup: { id: e.target.value, assignedBy: 'manual' } } : { workgroup: undefined });
                    }}
                  >
                    <option value="">{f.chooseOption}</option>
                    {WORKGROUPS.map((w) => (
                      <option key={w} value={w}>{strings.workgroups[w] ?? w}</option>
                    ))}
                  </select>
                )}
              </Field>
            ) : (
              <div className={styles.field} id={id('workgroup')} tabIndex={-1}>
                <span className={styles.label}>{f.workgroup}</span>
                <span>{strings.workgroups[c.workgroup?.id ?? ''] ?? c.workgroup?.id}</span>
                <span className={styles.hint}>{f.assignedByRule}</span>
              </div>
            )}
            {!readOnly && c.workgroup?.assignedBy === 'rule' && !editingWorkgroup ? (
              <button type="button" className={styles.link} onClick={() => { setEditingWorkgroup(true); }}>
                {f.changeWorkgroup}
              </button>
            ) : null}
            {!readOnly && manual && ruleWorkgroup ? (
              <button
                type="button"
                className={styles.link}
                onClick={() => {
                  setEditingWorkgroup(false);
                  onChange({ workgroup: ruleWorkgroup });
                }}
              >
                {f.useRule}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby={`${c.id}-details`}>
        <h3 id={`${c.id}-details`} className={styles.sectionTitle}>{f.sections.details}</h3>
        {!typeFields ? <p className={styles.hint}>{f.chooseReasonFirst}</p> : null}
        {typeFields?.length === 0 ? <p className={styles.hint}>{f.noTypeFields}</p> : null}
        {typeFields?.length ? (
          <div className={styles.grid}>
            {typeFields.map((tf) => (
              <Field key={tf} id={id(`typeFields.${tf}`)} label={strings.typeFields[tf] ?? tf} required error={err(`typeFields.${tf}`)}>
                {(p) => (
                  <input
                    {...p}
                    type="text"
                    autoComplete="off"
                    value={c.typeFields[tf] ?? ''}
                    disabled={readOnly}
                    onBlur={touch(`typeFields.${tf}`)}
                    onChange={(e) => { onChange({ typeFields: { [tf]: e.target.value } }); }}
                  />
                )}
              </Field>
            ))}
          </div>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby={`${c.id}-notes`}>
        <h3 id={`${c.id}-notes`} className={styles.sectionTitle}>{f.sections.notes}</h3>
        <Field id={id('notes')} label={f.notes} hint={f.notesHint} required error={err('notes')}>
          {(p) => (
            <textarea
              {...p}
              value={c.notes}
              disabled={readOnly}
              onBlur={touch('notes')}
              onChange={(e) => { onChange({ notes: e.target.value }); }}
            />
          )}
        </Field>
        <RadioField
          id={id('repeatContact')}
          label={f.repeatContact}
          hint={f.repeatContactHint}
          required
          error={err('repeatContact')}
          value={c.repeatContact === undefined ? undefined : c.repeatContact ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: f.yes },
            { value: 'no', label: f.no },
          ]}
          {...(readOnly ? { disabled: true } : {})}
          onChange={(v) => {
            touch('repeatContact')();
            onChange({ repeatContact: v === 'yes' });
          }}
        />
      </section>
    </div>
  );
}
