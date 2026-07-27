import { describe, expect, it } from 'vitest';
import {
  buildUserAccessFromRows,
  canSyncReports,
  filterDashboardDataForAccess,
  buildPortfolioSummaryFromRows,
  buildPropertyListFromRows,
  buildReportTimelineFromRows,
} from '../../src/web/app-server';

const properties = [
  ['id', 'code', 'name', 'status', 'timezone', 'driveFolderId', 'contacts'],
  ['prop-lj', 'LJ', 'La Jolla', 'active', 'America/New_York', 'folder-lj', 'pm@example.com'],
  ['prop-oasis', 'OAS', 'Oasis', 'active', 'America/New_York', 'folder-oasis', 'pm@example.com'],
  ['prop-august', 'AUG', 'August', 'active', 'America/New_York', 'folder-august', 'pm@example.com'],
  ['prop-dalecrest', 'DAL', 'Dalecrest', 'active', 'America/New_York', 'folder-dalecrest', 'pm@example.com'],
  ['prop-other', 'OTH', 'Other Property', 'active', 'America/New_York', 'folder-other', 'pm@example.com'],
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
  it('summarizes only the four MVP properties in the operating order', () => {
    expect(buildPortfolioSummaryFromRows(properties, kpis, expected)).toEqual([
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
      {
        id: 'prop-august',
        name: 'August',
        occupancy: null,
        leads: null,
        status: 'RECEIVED',
        late: false,
        lastUpdate: '--',
        receivedReports: 0,
        missingReports: 0,
        waitingReports: 0,
      },
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
        id: 'prop-dalecrest',
        name: 'Dalecrest',
        occupancy: null,
        leads: null,
        status: 'RECEIVED',
        late: false,
        lastUpdate: '--',
        receivedReports: 0,
        missingReports: 0,
        waitingReports: 0,
      },
    ]);
  });
});

describe('buildPropertyListFromRows', () => {
  it('returns only Oasis, August, La Jolla, and Dalecrest', () => {
    expect(buildPropertyListFromRows(properties)).toEqual([
      { id: 'prop-oasis', name: 'Oasis' },
      { id: 'prop-august', name: 'August' },
      { id: 'prop-lj', name: 'La Jolla' },
      { id: 'prop-dalecrest', name: 'Dalecrest' },
    ]);
  });
});

describe('dashboard access control', () => {
  const users = [
    ['email', 'role', 'allowedPropertyId', 'active'],
    ['asset@valoriscapitalpartners.com', 'asset_management', '', 'true'],
    ['owner@example.com', 'owner', 'prop-lj', 'true'],
    ['inactive@example.com', 'admin', '', 'false'],
  ];

  it('authorizes active users by email case-insensitively', () => {
    expect(buildUserAccessFromRows(users, 'ASSET@ValorisCapitalPartners.com')).toEqual({
      email: 'asset@valoriscapitalpartners.com',
      role: 'asset_management',
      allowedPropertyId: '',
    });
  });

  it('denies users missing from an active allowlist', () => {
    expect(() => buildUserAccessFromRows(users, 'unknown@example.com')).toThrow('Access denied');
  });

  it('filters dashboard data to an owner property when allowedPropertyId is set', () => {
    const data = {
      user: 'owner@example.com',
      properties: buildPropertyListFromRows(properties),
      portfolio: buildPortfolioSummaryFromRows(properties, kpis, expected),
      timeline: buildReportTimelineFromRows(properties, definitions, expected, received, kpis),
    };

    const filtered = filterDashboardDataForAccess(data, {
      email: 'owner@example.com',
      role: 'owner',
      allowedPropertyId: 'prop-lj',
    });

    expect(filtered.properties).toEqual([{ id: 'prop-lj', name: 'La Jolla' }]);
    expect(filtered.portfolio.map(property => property.id)).toEqual(['prop-lj']);
    expect(filtered.timeline.map(event => event.propertyId)).toEqual(['prop-lj']);
  });

  it('keeps report sync limited to operational roles', () => {
    expect(canSyncReports('asset_management')).toBe(true);
    expect(canSyncReports('pm')).toBe(true);
    expect(canSyncReports('owner')).toBe(false);
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
