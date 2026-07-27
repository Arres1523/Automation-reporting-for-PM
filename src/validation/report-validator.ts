import type { ParsedReport, ValidationResult } from '../domain/types';
import { VALIDATION_LIMITS } from '../domain/constants';

export function validateParsedReport(report: ParsedReport): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!report.propertyId) errors.push('propertyId is required');
  if (!report.reportDefinitionId) errors.push('reportDefinitionId is required');
  if (!report.periodStart) errors.push('periodStart is required');
  if (!report.periodEnd) errors.push('periodEnd is required');

  if (report.periodStart && report.periodEnd && report.periodStart > report.periodEnd) {
    errors.push('periodStart must be before or equal to periodEnd');
  }

  if (!report.metrics || report.metrics.length === 0) {
    warnings.push('No metrics extracted from report');
  }

  for (const metric of report.metrics || []) {
    if (metric.code === 'OCCUPANCY') {
      if (typeof metric.value !== 'number' || isNaN(metric.value)) {
        errors.push('Occupancy must be a number');
      } else if (metric.value < VALIDATION_LIMITS.OCCUPANCY_MIN || metric.value > VALIDATION_LIMITS.OCCUPANCY_MAX) {
        errors.push(`Occupancy must be between ${VALIDATION_LIMITS.OCCUPANCY_MIN} and ${VALIDATION_LIMITS.OCCUPANCY_MAX}`);
      }
      if (metric.unit !== 'PERCENT') {
        warnings.push('Occupancy should use PERCENT unit');
      }
    }

    if (metric.code === 'LEADS') {
      if (typeof metric.value !== 'number' || isNaN(metric.value)) {
        errors.push('Leads must be a number');
      } else if (metric.value < VALIDATION_LIMITS.LEADS_MIN) {
        errors.push(`Leads must be >= ${VALIDATION_LIMITS.LEADS_MIN}`);
      } else if (!Number.isInteger(metric.value)) {
        warnings.push('Leads should be an integer');
      }
      if (metric.unit !== 'COUNT') {
        warnings.push('Leads should use COUNT unit');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function isReportValid(report: ParsedReport): boolean {
  return validateParsedReport(report).valid;
}
