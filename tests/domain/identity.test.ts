import { describe, it, expect } from 'vitest';
import {
  buildExpectedReportId,
  buildReceivedReportId,
  buildKpiId,
  buildReminderId,
} from '../../src/domain/identity';

describe('buildExpectedReportId', () => {
  it('should compose from propertyId + definitionId + periodStart', () => {
    const id = buildExpectedReportId('prop-1', 'def-weekly', '2026-07-20');
    expect(id).toBe('prop-1_def-weekly_2026-07-20');
  });
});

describe('buildReceivedReportId', () => {
  it('should compose from messageId + sha256', () => {
    const id = buildReceivedReportId('msg123', 'abc123def456');
    expect(id).toBe('msg123_abc123def456');
  });

  it('should truncate sha to 12 chars and lowercase', () => {
    const id = buildReceivedReportId('msg1', 'ABC123DEF456GHI');
    expect(id).toBe('msg1_abc123def456');
  });
});

describe('buildKpiId', () => {
  it('should compose from expectedReportId + kpiCode', () => {
    const id = buildKpiId('prop-1_def-weekly_2026-07-20', 'OCCUPANCY');
    expect(id).toBe('prop-1_def-weekly_2026-07-20_OCCUPANCY');
  });
});

describe('buildReminderId', () => {
  it('should compose from expectedReportId + reminderType', () => {
    const id = buildReminderId('prop-1_def-weekly_2026-07-20', 'INITIAL');
    expect(id).toBe('prop-1_def-weekly_2026-07-20_INITIAL');
  });
});
