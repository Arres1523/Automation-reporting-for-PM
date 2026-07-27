import { describe, it, expect } from 'vitest';
import type { AuditLogEntry } from '../../src/audit/audit-log';

describe('AuditLogEntry structure', () => {
  it('should have required fields', () => {
    const entry: AuditLogEntry = {
      actor: 'user@valoris.com',
      action: 'CONFIG_UPDATE',
      entity: 'Properties',
      entityId: 'prop-1',
      oldValue: 'inactive',
      newValue: 'active',
      timestamp: '2026-07-27T12:00:00Z',
    };
    expect(entry.actor).toBe('user@valoris.com');
    expect(entry.action).toBe('CONFIG_UPDATE');
    expect(entry.timestamp).toBeDefined();
  });
});
