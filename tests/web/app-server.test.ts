import { describe, expect, it } from 'vitest';
import {
  buildPortfolioSummaryFromRows,
  buildReportTimelineFromRows,
} from '../../src/web/app-server';

const properties = [
  ['id', 'code', 'name', 'status', 'timezone', 'driveFolderId', 'contacts'],
  ['prop-lj', 'LJ', 'La Jolla', 'active', 'America/New_York', 'folder-lj', 'pm@example.com'],
  ['prop-oasis', 'OAS', 'Oasis', 'active', 'America/New_York', 'folder-oasis', 'pm@example.com'],
];

const definitions = [
  ['id', 'propertyId', 'type', 'frequency', 'parserKey', 'authorizedSenders', 'deadlineRule', 'escalationRecipients'],
  ['def-lj-daily', 'prop-lj', 'Daily Manager Report', 'DAILY', 'lj-daily', 'sender@example.com', 'Daily Manager Report', 'asset@example.com'],
  ['def-oasis-weekly', 'prop-oasis', 'Weekly Leads Report', 'WEEKLY', 'oasis-weekly', 'oasis@example.com', 'Weekly Leads', 'asset@example.com'],
];

const expected = [
  ['id', 'propertyId', 'reportDefinitionId', 'periodStart', 'periodEnd', 'deadline', 'status', 'receivedReportId', 'late', 'reminderDates'],
  ['exp-lj-1', 'prop-lj', 'def-lj-daily', '2026-07-26', '2026-07-26', '2026-07-27T14:00:00.000Z', 'RECEIVED', 'recv-lj-1', 'false', ''],
  ['exp-oasis-1', 'prop-oasis', 'def-oasis-weekly', '2026-07-20', '2026-07-26', '2026-07-27T14:00:00.000Z', 'MISSING', '', 'false', ''],
];

const received = [
  ['id', 'messageId', 'fileHash', 'receivedAt', 'propertyId', 'reportDefinitionId', 'periodStart', 'driveLink', 'classification'],
  ['recv-lj-1', 'gmail-1', 'file.xlsx', '2026-07-27T13:30:00.000Z', 'prop-lj', 'def-lj-daily', '2026-07-26', 'https://drive.google.com/file/d/1', 'AUTOMATIC'],
];

const kpis = [
  ['id', 'propertyId', 'periodStart', 'periodEnd', 'kpiCode', 'value', 'unit', 'sourceReportId', 'publishedAt'],
  ['kpi-1', 'prop-lj', '2026-07-26', '2026-07-26', 'OCCUPANCY', 92, '%', 'recv-lj-1', '2026-07-27T13:40:00.000Z'],
  ['kpi-2', 'prop-lj', '2026-07-26', '2026-07-26', 'LEADS', 14, 'count', 'recv-lj-1', '2026-07-27T13:40:00.000Z'],
];

describe('buildPortfolioSummaryFromRows', () => {
  it('summarizes received, missing, and late report counts per active property', () => {
    expect(buildPortfolioSummaryFromRows(properties, kpis, expected)).toEqual([
      {
        id: 'prop-lj',
        name: 'La Jolla',
        occupancy: 92,
        leads: 14,
        status: 'RECEIVED',
        late: false,
        lastUpdate: '2026-07-27T13:40:00.000Z',
        receivedReports: 1,
        missingReports: 0,
        waitingReports: 0,
      },
      {
        id: 'prop-oasis',
        name: 'Oasis',
        occupancy: null,
        leads: null,
        status: 'MISSING',
        late: false,
        lastUpdate: '--',
        receivedReports: 0,
        missingReports: 1,
        waitingReports: 0,
      },
    ]);
  });
});

describe('buildReportTimelineFromRows', () => {
  it('builds report timeline events with Drive links and KPI content', () => {
    expect(buildReportTimelineFromRows(properties, definitions, expected, received, kpis, 'prop-lj')).toEqual([
      {
        id: 'exp-lj-1',
        propertyId: 'prop-lj',
        propertyName: 'La Jolla',
        reportType: 'Daily Manager Report',
        frequency: 'DAILY',
        periodStart: '2026-07-26',
        periodEnd: '2026-07-26',
        deadline: '2026-07-27T14:00:00.000Z',
        status: 'RECEIVED',
        late: false,
        receivedAt: '2026-07-27T13:30:00.000Z',
        driveLink: 'https://drive.google.com/file/d/1',
        occupancy: 92,
        leads: 14,
      },
    ]);
  });
});
