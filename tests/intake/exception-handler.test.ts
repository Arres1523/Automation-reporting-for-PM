import { describe, it, expect } from 'vitest';
import { logException, resolveException } from '../../src/intake/exception-handler';
import type { ExceptionLogEntry } from '../../src/intake/exception-handler';

describe('ExceptionLogEntry type', () => {
  it('should have required fields', () => {
    const entry: ExceptionLogEntry = {
      id: 'exc-1',
      documentId: 'msg-1',
      stage: 'classification',
      error: 'Unknown sender',
      severity: 'ERROR',
      status: 'OPEN',
      assignee: 'admin',
      createdAt: '2026-07-27T12:00:00Z',
    };
    expect(entry.stage).toBe('classification');
    expect(entry.status).toBe('OPEN');
  });
});
