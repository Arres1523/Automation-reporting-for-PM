import { describe, it, expect } from 'vitest';
import { evaluateStatus } from '../../src/status/status-engine';

describe('evaluateStatus', () => {
  it('should return WAITING before deadline without report', () => {
    const result = evaluateStatus('2026-07-30T23:59:59Z', false, null, new Date('2026-07-27'));
    expect(result.status).toBe('WAITING');
    expect(result.late).toBe(false);
  });

  it('should return MISSING after deadline without report', () => {
    const result = evaluateStatus('2026-07-25T23:59:59Z', false, null, new Date('2026-07-27'));
    expect(result.status).toBe('MISSING');
    expect(result.transition).toBeDefined();
    expect(result.transition!.from).toBe('WAITING');
    expect(result.transition!.to).toBe('MISSING');
  });

  it('should return RECEIVED with valid report before deadline', () => {
    const result = evaluateStatus('2026-07-30T23:59:59Z', true, '2026-07-27T10:00:00Z', new Date('2026-07-27'));
    expect(result.status).toBe('RECEIVED');
    expect(result.late).toBe(false);
  });

  it('should mark late if report arrives after deadline', () => {
    const result = evaluateStatus('2026-07-25T23:59:59Z', true, '2026-07-27T10:00:00Z', new Date('2026-07-27'));
    expect(result.status).toBe('RECEIVED');
    expect(result.late).toBe(true);
  });
});
