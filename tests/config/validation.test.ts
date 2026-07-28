import { describe, it, expect } from 'vitest';
import {
  validatePropertyConfig,
  validateReportDefinition,
  validateExpectedReport,
  validateUser,
  validateUniqueIds,
  collectAllValidationIssues,
  isConfigValid,
} from '../../src/config/validation';

describe('validatePropertyConfig', () => {
  it('should return errors for missing required fields', () => {
    const issues = validatePropertyConfig({ id: '', code: '', name: '', status: '', timezone: '' });
    expect(issues.filter(i => i.severity === 'ERROR').length).toBeGreaterThanOrEqual(3);
  });

  it('should warn on invalid status', () => {
    const issues = validatePropertyConfig({ id: 'p1', code: 'P1', name: 'Test', status: 'unknown', timezone: 'UTC' });
    expect(issues.some(i => i.message.includes('Status'))).toBe(true);
  });

  it('should pass for valid config', () => {
    const issues = validatePropertyConfig({ id: 'p1', code: 'P1', name: 'Test', status: 'active', timezone: 'America/New_York' });
    expect(issues.filter(i => i.severity === 'ERROR')).toHaveLength(0);
  });
});

describe('validateReportDefinition', () => {
  it('should error on missing frequency', () => {
    const issues = validateReportDefinition({
      id: 'd1', propertyId: 'p1', type: 'occupancy', frequency: '', parserKey: 'csv', authorizedSenders: 'a@b.com', deadlineRule: '24h',
    });
    expect(issues.some(i => i.field === 'frequency')).toBe(true);
  });

  it('should error on invalid frequency', () => {
    const issues = validateReportDefinition({
      id: 'd1', propertyId: 'p1', type: 'occupancy', frequency: 'YEARLY', parserKey: 'csv', authorizedSenders: 'a@b.com', deadlineRule: '24h',
    });
    expect(issues.some(i => i.message.includes('Frequency'))).toBe(true);
  });
});

describe('validateUser', () => {
  it('should error on invalid email format', () => {
    const issues = validateUser({ email: 'not-an-email', role: 'admin', allowedPropertyIds: 'p1' });
    expect(issues.some(i => i.field === 'email')).toBe(true);
  });

  it('should error on invalid role', () => {
    const issues = validateUser({ email: 'a@b.com', role: 'superadmin', allowedPropertyIds: 'p1' });
    expect(issues.some(i => i.field === 'role')).toBe(true);
  });

  it('accepts the internal Valoris dashboard roles', () => {
    for (const role of ['admin', 'asset_management', 'asset management', 'data_analyst', 'pm', 'owner']) {
      const issues = validateUser({ email: `${role.replace(/\s+/g, '_')}@example.com`, role, allowedPropertyIds: 'prop-oasis,prop-august' });
      expect(issues.filter(i => i.severity === 'ERROR')).toHaveLength(0);
    }
  });
});

describe('validateUniqueIds', () => {
  it('should detect duplicates', () => {
    const issues = validateUniqueIds(['a', 'b', 'a'], 'test');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('Duplicate');
  });

  it('should pass for unique ids', () => {
    const issues = validateUniqueIds(['a', 'b', 'c'], 'test');
    expect(issues).toHaveLength(0);
  });
});

describe('collectAllValidationIssues', () => {
  it('should separate errors and warnings', () => {
    const result = collectAllValidationIssues([
      [{ field: 'a', message: 'error', severity: 'ERROR' }],
      [{ field: 'b', message: 'warning', severity: 'WARNING' }],
    ]);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });
});

describe('isConfigValid', () => {
  it('should return false when errors exist', () => {
    expect(isConfigValid([{ field: 'a', message: 'e', severity: 'ERROR' }])).toBe(false);
  });

  it('should return true for warnings only', () => {
    expect(isConfigValid([{ field: 'a', message: 'w', severity: 'WARNING' }])).toBe(true);
  });
});
