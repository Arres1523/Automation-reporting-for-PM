import { describe, it, expect } from 'vitest';
import { validateParsedReport, isReportValid } from '../../src/validation/report-validator';
import type { ParsedReport } from '../../src/domain/types';

const validReport: ParsedReport = {
  propertyId: 'prop-1',
  reportDefinitionId: 'def-weekly',
  periodStart: '2026-07-20',
  periodEnd: '2026-07-26',
  metrics: [
    { code: 'OCCUPANCY', value: 85, unit: 'PERCENT' },
    { code: 'LEADS', value: 12, unit: 'COUNT' },
  ],
  warnings: [],
};

describe('validateParsedReport', () => {
  it('should pass for valid report', () => {
    const result = validateParsedReport(validReport);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing propertyId', () => {
    const result = validateParsedReport({ ...validReport, propertyId: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('propertyId'))).toBe(true);
  });

  it('should reject occupancy out of range', () => {
    const result = validateParsedReport({
      ...validReport,
      metrics: [{ code: 'OCCUPANCY', value: 150, unit: 'PERCENT' }],
    });
    expect(result.valid).toBe(false);
  });

  it('should reject negative leads', () => {
    const result = validateParsedReport({
      ...validReport,
      metrics: [{ code: 'LEADS', value: -5, unit: 'COUNT' }],
    });
    expect(result.valid).toBe(false);
  });

  it('should warn on non-integer leads', () => {
    const result = validateParsedReport({
      ...validReport,
      metrics: [{ code: 'LEADS', value: 12.5, unit: 'COUNT' }],
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should reject periodStart after periodEnd', () => {
    const result = validateParsedReport({
      ...validReport,
      periodStart: '2026-07-30',
      periodEnd: '2026-07-20',
    });
    expect(result.valid).toBe(false);
  });

  it('should warn on no metrics', () => {
    const result = validateParsedReport({ ...validReport, metrics: [] });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('isReportValid', () => {
  it('should return true for valid', () => {
    expect(isReportValid(validReport)).toBe(true);
  });

  it('should return false for invalid', () => {
    expect(isReportValid({ ...validReport, propertyId: '' })).toBe(false);
  });
});
