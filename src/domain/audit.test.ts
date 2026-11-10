import { describe, expect, it, vi } from 'vitest';
import { NOW } from '@/test/factories';
import { auditEvent, auditLog, createAuditEmitter } from './audit';

describe('auditEvent', () => {
  it('records actor, action, time, and IDs/field names only', () => {
    expect(auditEvent('AGT-1', 'case.updated', { changedFields: ['notes'], refIds: ['CS-1'] }, NOW)).toEqual({
      at: NOW.toISOString(),
      actorId: 'AGT-1',
      action: 'case.updated',
      changedFields: ['notes'],
      refIds: ['CS-1'],
    });
  });

  it('omits empty lists and defaults the clock', () => {
    const e = auditEvent('AGT-1', 'masked.reveal', { changedFields: [] });
    expect(e).not.toHaveProperty('changedFields');
    expect(e).not.toHaveProperty('refIds');
    expect(Date.parse(e.at)).toBeGreaterThan(0);
  });

  it('copies the input lists', () => {
    const fields = ['notes'];
    const e = auditEvent('A', 'x', { changedFields: fields }, NOW);
    fields.push('disposition');
    expect(e.changedFields).toEqual(['notes']);
  });
});

describe('audit emitter', () => {
  it('delivers events to subscribers until they unsubscribe', () => {
    const emitter = createAuditEmitter();
    const listener = vi.fn();
    const unsubscribe = emitter.subscribe(listener);
    const e = auditEvent('A', 'case.created', {}, NOW);
    emitter.emit(e);
    unsubscribe();
    emitter.emit(e);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(e);
  });

  it('exposes a shared app-wide log', () => {
    const listener = vi.fn();
    const off = auditLog.subscribe(listener);
    auditLog.emit(auditEvent('A', 'x', {}, NOW));
    off();
    expect(listener).toHaveBeenCalledOnce();
  });
});
