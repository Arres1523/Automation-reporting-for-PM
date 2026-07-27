import { processInbox } from '../intake/intake-orchestrator';
import { checkAndSendReminders } from '../status/reminder-service';
import { evaluateReportStatuses } from '../status/status-engine';
import { buildClassificationRulesFromRows, requireSheetByName } from '../runtime/app-script-runtime';

export function renderApp(): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile('web/app');
  return template.evaluate().setTitle('Valoris Reporting MVP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

export interface PortfolioProperty {
  id: string;
  name: string;
  occupancy: number | null;
  leads: number | null;
  status: string;
  late: boolean;
  lastUpdate: string;
  receivedReports: number;
  missingReports: number;
  waitingReports: number;
}

export interface ReportTimelineEvent {
  id: string;
  propertyId: string;
  propertyName: string;
  reportType: string;
  frequency: string;
  periodStart: string;
  periodEnd: string;
  deadline: string;
  status: string;
  late: boolean;
  receivedAt: string;
  driveLink: string;
  occupancy: number | null;
  leads: number | null;
}

export interface DashboardData {
  user: string;
  properties: Array<{ id: string; name: string }>;
  portfolio: PortfolioProperty[];
  timeline: ReportTimelineEvent[];
}

export interface SyncReportsResult {
  processed: number;
  errors: number;
  skipped: number;
  transitions: number;
  reminders: number;
  syncedAt: string;
  details: string[];
}

interface KpiSnapshot {
  occupancy: number | null;
  leads: number | null;
  lastUpdate: string;
}

const MVP_PROPERTY_ORDER = ['oasis', 'august', 'la jolla', 'dalecrest'] as const;

function stringCell(row: unknown[], index: number): string {
  return String(row[index] ?? '');
}

function boolCell(row: unknown[], index: number): boolean {
  return String(row[index] ?? '').toLowerCase() === 'true';
}

function normalizePropertyName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mvpPropertyRank(row: unknown[]): number {
  const candidates = [
    normalizePropertyName(stringCell(row, 0)),
    normalizePropertyName(stringCell(row, 1)),
    normalizePropertyName(stringCell(row, 2)),
  ].join(' ');

  return MVP_PROPERTY_ORDER.findIndex(propertyName => candidates.includes(propertyName));
}

function isMvpProperty(row: unknown[]): boolean {
  return mvpPropertyRank(row) >= 0;
}

function buildLatestKpiMap(kpiRows: unknown[][]): Map<string, KpiSnapshot> {
  const latest = new Map<string, KpiSnapshot>();

  for (let i = 1; i < kpiRows.length; i++) {
    const row = kpiRows[i];
    const propertyId = stringCell(row, 1);
    const kpiCode = stringCell(row, 4);
    const value = Number(row[5]);
    const publishedAt = stringCell(row, 8) || '--';
    const current = latest.get(propertyId) || { occupancy: null, leads: null, lastUpdate: '--' };

    if (kpiCode === 'OCCUPANCY' && !Number.isNaN(value)) current.occupancy = value;
    if (kpiCode === 'LEADS' && !Number.isNaN(value)) current.leads = value;
    if (publishedAt !== '--' && (current.lastUpdate === '--' || publishedAt > current.lastUpdate)) {
      current.lastUpdate = publishedAt;
    }

    latest.set(propertyId, current);
  }

  return latest;
}

function buildKpisBySource(kpiRows: unknown[][]): Map<string, KpiSnapshot> {
  const bySource = new Map<string, KpiSnapshot>();

  for (let i = 1; i < kpiRows.length; i++) {
    const row = kpiRows[i];
    const sourceReportId = stringCell(row, 7);
    if (!sourceReportId) continue;

    const current = bySource.get(sourceReportId) || { occupancy: null, leads: null, lastUpdate: '--' };
    const value = Number(row[5]);
    if (stringCell(row, 4) === 'OCCUPANCY' && !Number.isNaN(value)) current.occupancy = value;
    if (stringCell(row, 4) === 'LEADS' && !Number.isNaN(value)) current.leads = value;
    current.lastUpdate = stringCell(row, 8) || current.lastUpdate;
    bySource.set(sourceReportId, current);
  }

  return bySource;
}

export function buildPortfolioSummaryFromRows(
  propertyRows: unknown[][],
  kpiRows: unknown[][],
  expectedRows: unknown[][]
): PortfolioProperty[] {
  const kpisByProperty = buildLatestKpiMap(kpiRows);

  return propertyRows.slice(1).filter(row => (
    String(row[3]).toLowerCase() === 'active' && isMvpProperty(row)
  )).sort((a, b) => mvpPropertyRank(a) - mvpPropertyRank(b)).map(row => {
    const propertyId = stringCell(row, 0);
    const counts = { received: 0, missing: 0, waiting: 0, late: false };

    for (let i = 1; i < expectedRows.length; i++) {
      const expected = expectedRows[i];
      if (stringCell(expected, 1) !== propertyId) continue;
      const status = stringCell(expected, 6);
      if (status === 'RECEIVED') counts.received++;
      if (status === 'MISSING') counts.missing++;
      if (status === 'WAITING') counts.waiting++;
      if (boolCell(expected, 8)) counts.late = true;
    }

    const kpi = kpisByProperty.get(propertyId) || { occupancy: null, leads: null, lastUpdate: '--' };

    return {
      id: propertyId,
      name: String(row[2]),
      occupancy: kpi.occupancy,
      leads: kpi.leads,
      status: counts.missing > 0 ? 'MISSING' : counts.waiting > 0 ? 'WAITING' : 'RECEIVED',
      late: counts.late,
      lastUpdate: kpi.lastUpdate,
      receivedReports: counts.received,
      missingReports: counts.missing,
      waitingReports: counts.waiting,
    };
  });
}

export function buildPropertyListFromRows(propertyRows: unknown[][]): Array<{ id: string; name: string }> {
  return propertyRows.slice(1)
    .filter(row => String(row[3]).toLowerCase() === 'active' && isMvpProperty(row))
    .sort((a, b) => mvpPropertyRank(a) - mvpPropertyRank(b))
    .map(row => ({ id: stringCell(row, 0), name: stringCell(row, 2) }));
}

export function buildReportTimelineFromRows(
  propertyRows: unknown[][],
  definitionRows: unknown[][],
  expectedRows: unknown[][],
  receivedRows: unknown[][],
  kpiRows: unknown[][],
  propertyId?: string
): ReportTimelineEvent[] {
  const properties = new Map<string, string>();
  for (let i = 1; i < propertyRows.length; i++) {
    properties.set(stringCell(propertyRows[i], 0), stringCell(propertyRows[i], 2));
  }

  const definitions = new Map<string, { type: string; frequency: string }>();
  for (let i = 1; i < definitionRows.length; i++) {
    definitions.set(stringCell(definitionRows[i], 0), {
      type: stringCell(definitionRows[i], 2),
      frequency: stringCell(definitionRows[i], 3),
    });
  }

  const received = new Map<string, { receivedAt: string; driveLink: string }>();
  for (let i = 1; i < receivedRows.length; i++) {
    received.set(stringCell(receivedRows[i], 0), {
      receivedAt: stringCell(receivedRows[i], 3),
      driveLink: stringCell(receivedRows[i], 7),
    });
  }

  const kpisBySource = buildKpisBySource(kpiRows);

  return expectedRows.slice(1)
    .filter(row => !propertyId || stringCell(row, 1) === propertyId)
    .map(row => {
      const receivedReportId = stringCell(row, 7);
      const definition = definitions.get(stringCell(row, 2)) || { type: stringCell(row, 2), frequency: '' };
      const receivedReport = received.get(receivedReportId) || { receivedAt: '', driveLink: '' };
      const kpi = kpisBySource.get(receivedReportId) || { occupancy: null, leads: null, lastUpdate: '--' };

      return {
        id: stringCell(row, 0),
        propertyId: stringCell(row, 1),
        propertyName: properties.get(stringCell(row, 1)) || stringCell(row, 1),
        reportType: definition.type,
        frequency: definition.frequency,
        periodStart: stringCell(row, 3),
        periodEnd: stringCell(row, 4),
        deadline: stringCell(row, 5),
        status: stringCell(row, 6),
        late: boolCell(row, 8),
        receivedAt: receivedReport.receivedAt,
        driveLink: receivedReport.driveLink,
        occupancy: kpi.occupancy,
        leads: kpi.leads,
      };
    })
    .sort((a, b) => b.deadline.localeCompare(a.deadline));
}

export function getPortfolioSummary(): PortfolioProperty[] {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const propsSheet = ss.getSheetByName('Properties');
  if (!propsSheet) return [];

  const kpiSheet = ss.getSheetByName('KPIHistory');
  const expectedSheet = ss.getSheetByName('ExpectedReports');

  return buildPortfolioSummaryFromRows(
    propsSheet.getDataRange().getValues(),
    kpiSheet ? kpiSheet.getDataRange().getValues() : [[]],
    expectedSheet ? expectedSheet.getDataRange().getValues() : [[]]
  );
}

export function getCurrentUser(): string {
  return Session.getActiveUser().getEmail();
}

export function getPropertyList(): Array<{ id: string; name: string }> {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Properties');
  if (!sheet) return [];

  return buildPropertyListFromRows(sheet.getDataRange().getValues());
}

export function getReportTimeline(propertyId?: string): ReportTimelineEvent[] {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const propsSheet = ss.getSheetByName('Properties');
  const defsSheet = ss.getSheetByName('ReportDefinitions');
  const expectedSheet = ss.getSheetByName('ExpectedReports');
  const receivedSheet = ss.getSheetByName('ReceivedReports');
  const kpiSheet = ss.getSheetByName('KPIHistory');

  if (!propsSheet || !defsSheet || !expectedSheet || !receivedSheet || !kpiSheet) return [];

  return buildReportTimelineFromRows(
    propsSheet.getDataRange().getValues(),
    defsSheet.getDataRange().getValues(),
    expectedSheet.getDataRange().getValues(),
    receivedSheet.getDataRange().getValues(),
    kpiSheet.getDataRange().getValues(),
    propertyId
  );
}

export function getDashboardData(propertyId?: string): DashboardData {
  return {
    user: getCurrentUser(),
    properties: getPropertyList(),
    portfolio: getPortfolioSummary(),
    timeline: getReportTimeline(propertyId),
  };
}

export function syncReportsNow(): SyncReportsResult {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reportDefinitionsSheet = requireSheetByName(ss, 'ReportDefinitions');
  const rules = buildClassificationRulesFromRows(reportDefinitionsSheet.getDataRange().getValues());
  const scriptProperties = PropertiesService.getScriptProperties();
  const rootFolderId = scriptProperties.getProperty('DRIVE_ROOT_FOLDER_ID');
  const pmNotificationEmail = scriptProperties.getProperty('PM_NOTIFICATION_EMAIL');
  const assetManagementEmail = scriptProperties.getProperty('ASSET_MANAGEMENT_EMAIL');

  if (!rootFolderId) {
    throw new Error('Missing script property: DRIVE_ROOT_FOLDER_ID');
  }
  if (!pmNotificationEmail) {
    throw new Error('Missing script property: PM_NOTIFICATION_EMAIL');
  }
  if (!assetManagementEmail) {
    throw new Error('Missing script property: ASSET_MANAGEMENT_EMAIL');
  }

  const intake = processInbox(
    rules,
    {
      received: requireSheetByName(ss, 'ReceivedReports'),
      exceptions: requireSheetByName(ss, 'ExceptionQueue'),
    },
    {
      rootFolderId,
    }
  );

  const transitions = evaluateReportStatuses(requireSheetByName(ss, 'ExpectedReports'));
  const reminders = checkAndSendReminders(
    requireSheetByName(ss, 'ExpectedReports'),
    requireSheetByName(ss, 'ReminderLog'),
    {
      defaultRecipient: pmNotificationEmail,
      escalationRecipient: assetManagementEmail,
    }
  );

  return {
    processed: intake.processed,
    errors: intake.errors,
    skipped: intake.skipped,
    transitions: transitions.length,
    reminders: reminders.length,
    syncedAt: new Date().toISOString(),
    details: intake.details,
  };
}
