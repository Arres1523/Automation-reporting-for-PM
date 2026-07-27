import { describe, it, expect } from 'vitest';
import { buildReminderSubject, buildReminderBody } from '../../src/status/reminder-service';

describe('buildReminderSubject', () => {
  it('should include MISSING and property ID', () => {
    const subject = buildReminderSubject('prop-1', 'WEEKLY', '2026-W30');
    expect(subject).toContain('MISSING');
    expect(subject).toContain('prop-1');
  });
});

describe('buildReminderBody', () => {
  it('should include report details', () => {
    const body = buildReminderBody('prop-1', 'WEEKLY', '2026-W30', '2026-07-28', false);
    expect(body).toContain('prop-1');
    expect(body).toContain('WEEKLY');
    expect(body).toContain('2026-W30');
    expect(body).not.toContain('ESCALATION');
  });

  it('should mark escalation', () => {
    const body = buildReminderBody('prop-1', 'WEEKLY', '2026-W30', '2026-07-28', true);
    expect(body).toContain('ESCALATION');
  });
});
