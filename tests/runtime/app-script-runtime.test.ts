import { describe, expect, it } from 'vitest';
import {
  buildClassificationRulesFromRows,
  getTriggerSpecs,
  requireSheetByName,
} from '../../src/runtime/app-script-runtime';

describe('requireSheetByName', () => {
  it('throws a clear error when a required sheet is missing', () => {
    const spreadsheet = {
      getSheetByName: (name: string) => (name === 'Properties' ? { name } : null),
    } as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet;

    expect(() => requireSheetByName(spreadsheet, 'ReceivedReports')).toThrow(
      'Missing required sheet: ReceivedReports'
    );
  });
});

describe('buildClassificationRulesFromRows', () => {
  it('maps ReportDefinitions rows into classifier rules', () => {
    const rows = [
      ['id', 'propertyId', 'type', 'frequency', 'parserKey', 'authorizedSenders', 'deadlineRule', 'escalationRecipients'],
      ['def-lj-daily', 'prop-lj', 'DAILY_REPORT', 'DAILY', 'sender@example.com', 'Daily Report', '.*\\.xlsx$', 'asset@example.com'],
      ['', 'prop-empty', 'DAILY_REPORT', 'DAILY', 'skip@example.com', 'Skip', '.*', 'asset@example.com'],
    ];

    expect(buildClassificationRulesFromRows(rows)).toEqual([
      {
        reportDefinitionId: 'def-lj-daily',
        propertyId: 'prop-lj',
        senderPattern: 'sender@example.com',
        subjectPattern: 'Daily Report',
        fileNamePattern: '.*\\.xlsx$',
        frequency: 'DAILY',
      },
    ]);
  });
});

describe('getTriggerSpecs', () => {
  it('returns the DEV trigger schedule for the Apps Script handlers', () => {
    expect(getTriggerSpecs()).toEqual([
      { handlerName: 'processIntake', everyMinutes: 5 },
      { handlerName: 'evaluateStatuses', everyHours: 1 },
      { handlerName: 'extendCalendar', everyHours: 24 },
    ]);
  });
});
