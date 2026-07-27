import { describe, it, expect } from 'vitest';
import {
  generateExpectedReports,
  getPeriodsToGenerate,
  deduplicateReports,
} from '../../src/status/expected-report-generator';

describe('getPeriodsToGenerate', () => {
  it('should generate DAILY periods', () => {
    const periods = getPeriodsToGenerate('DAILY', new Date(2026, 6, 27));
    expect(periods).toHaveLength(14);
    expect(periods[0].periodStart).toBe('2026-07-27');
    expect(periods[13].periodStart).toBe('2026-08-09');
  });

  it('should generate WEEKLY periods starting Monday', () => {
    const periods = getPeriodsToGenerate('WEEKLY', new Date(2026, 6, 27));
    expect(periods).toHaveLength(8);
    expect(periods[0].periodStart).toBe('2026-07-27');
    expect(periods[0].periodEnd).toBe('2026-08-02');
  });

  it('should generate MONTHLY periods', () => {
    const periods = getPeriodsToGenerate('MONTHLY', new Date(2026, 6, 27));
    expect(periods).toHaveLength(6);
    expect(periods[0].periodStart).toBe('2026-07-01');
    expect(periods[0].periodEnd).toBe('2026-07-31');
    expect(periods[1].periodStart).toBe('2026-08-01');
  });
});

describe('generateExpectedReports', () => {
  it('should create reports for all definitions', () => {
    const defs = [
      { id: 'def-1', propertyId: 'prop-1', frequency: 'DAILY' },
      { id: 'def-2', propertyId: 'prop-1', frequency: 'WEEKLY' },
    ];
    const reports = generateExpectedReports(defs, new Date(2026, 6, 27));
    expect(reports).toHaveLength(14 + 8);
  });

  it('should set status to WAITING', () => {
    const defs = [{ id: 'def-1', propertyId: 'prop-1', frequency: 'DAILY' }];
    const reports = generateExpectedReports(defs, new Date(2026, 6, 27));
    expect(reports[0].status).toBe('WAITING');
  });

  it('should generate unique IDs', () => {
    const defs = [{ id: 'def-1', propertyId: 'prop-1', frequency: 'DAILY' }];
    const reports = generateExpectedReports(defs, new Date(2026, 6, 27));
    const ids = reports.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('deduplicateReports', () => {
  it('should filter out existing IDs', () => {
    const reports = [
      { id: 'a', propertyId: 'p1', reportDefinitionId: 'd1', periodStart: '2026-07-27', periodEnd: '2026-07-27', deadline: '2026-07-28', status: 'WAITING', receivedReportId: '', late: 'false', reminderDates: '' },
      { id: 'b', propertyId: 'p1', reportDefinitionId: 'd1', periodStart: '2026-07-28', periodEnd: '2026-07-28', deadline: '2026-07-29', status: 'WAITING', receivedReportId: '', late: 'false', reminderDates: '' },
    ];
    const result = deduplicateReports(reports, ['a']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });
});
