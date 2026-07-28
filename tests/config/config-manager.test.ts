import { describe, it, expect } from 'vitest';
import { applyPropertyConfigChange, applyReportDefinitionChange, applyUserChange } from '../../src/config/config-manager';
import type { ConfigChange } from '../../src/config/config-manager';

describe('applyPropertyConfigChange', () => {
  it('should validate and return errors for invalid config', () => {
    const change: ConfigChange = {
      actor: 'admin@valoris.com',
      entity: 'Properties',
      entityId: 'prop-1',
      oldValue: '{}',
      newValue: JSON.stringify({ id: '', code: '', name: '', status: 'unknown', timezone: '' }),
    };
    const mockSheet = {} as GoogleAppsScript.Spreadsheet.Sheet;
    const result = applyPropertyConfigChange(mockSheet, change);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('applyReportDefinitionChange', () => {
  it('should return errors for missing fields', () => {
    const change: ConfigChange = {
      actor: 'admin@valoris.com',
      entity: 'ReportDefinitions',
      entityId: 'def-1',
      oldValue: '{}',
      newValue: JSON.stringify({ id: '', propertyId: '', type: '', frequency: '', parserKey: '', authorizedSenders: '', deadlineRule: '' }),
    };
    const mockSheet = {} as GoogleAppsScript.Spreadsheet.Sheet;
    const result = applyReportDefinitionChange(mockSheet, change);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('applyUserChange', () => {
  it('should return errors for invalid email', () => {
    const change: ConfigChange = {
      actor: 'admin@valoris.com',
      entity: 'Users',
      entityId: 'invalid-email',
      oldValue: '{}',
      newValue: JSON.stringify({ email: 'invalid-email', role: 'admin', allowedPropertyIds: 'p1' }),
    };
    const mockSheet = {} as GoogleAppsScript.Spreadsheet.Sheet;
    const result = applyUserChange(mockSheet, change);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
