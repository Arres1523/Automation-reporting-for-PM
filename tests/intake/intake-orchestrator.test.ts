import { describe, it, expect } from 'vitest';
import type { IntakeResult } from '../../src/intake/intake-orchestrator';

describe('IntakeResult type', () => {
  it('should have required fields', () => {
    const r: IntakeResult = { processed: 5, errors: 1, skipped: 2, details: [] };
    expect(r.processed).toBe(5);
    expect(r.errors).toBe(1);
  });
});
