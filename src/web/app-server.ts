import { processInbox } from '../intake/intake-orchestrator';
import { checkAndSendReminders } from '../status/reminder-service';
import { evaluateReportStatuses } from '../status/status-engine';
import { buildClassificationRulesFromRows, getConfiguredSpreadsheet, requireSheetByName } from '../runtime/app-script-runtime';

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

export interface DashboardMetric {
  code: string;
  value: number;
  unit: string;
  publishedAt: string;
}

export interface FinancialMetric extends DashboardMetric {
  id: string;
  propertyId: string;
  periodStart: string;
  periodEnd: string;
  sourceReportId: string;
}

export interface ReportHealth {
  received: number;
  missing: number;
  waiting: number;
  late: number;
}

export interface DashboardException {
  id: string;
  documentId: string;
  stage: string;
  error: string;
  severity: string;
  status: string;
  assignee: string;
  createdAt: string;
}

export interface LateReport {
  id: string;
  propertyId: string;
  reportDefinitionId: string;
  periodStart: string;
  periodEnd: string;
  deadline: string;
  status: string;
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
  metrics: DashboardMetric[];
}

export interface DashboardData {
  user: string;
  role: string;
  capabilities: {
    canSync: boolean;
    canManageAdmin: boolean;
    canViewPortfolio: boolean;
  };
  properties: Array<{ id: string; name: string }>;
  portfolio: PortfolioProperty[];
  timeline: ReportTimelineEvent[];
  financialMetrics: FinancialMetric[];
  reportHealth: ReportHealth;
  exceptions: DashboardException[];
  lateReports: LateReport[];
}

export interface UserAccess {
  email: string;
  role: string;
  allowedPropertyIds: string[];
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
  metrics: DashboardMetric[];
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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeRole(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'asset') return 'asset_management';
  return normalized;
}

function parseAllowedPropertyIds(value: string): string[] {
  return value.split(',')
    .map(propertyId => propertyId.trim())
    .filter(Boolean);
}

export function canSyncReports(role: string): boolean {
  return ['setup', 'admin', 'asset_management', 'data_analyst', 'pm'].includes(normalizeRole(role));
}

export function canManageAdmin(role: string): boolean {
  return ['setup', 'admin'].includes(normalizeRole(role));
}

export function canViewPortfolio(role: string): boolean {
  return ['setup', 'admin', 'asset_management', 'data_analyst', 'pm'].includes(normalizeRole(role));
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
    const current = latest.get(propertyId) || { occupancy: null, leads: null, lastUpdate: '--', metrics: [] };

    if (kpiCode === 'OCCUPANCY' && !Number.isNaN(value)) current.occupancy = value;
    if (kpiCode === 'LEADS' && !Number.isNaN(value)) current.leads = value;
    if (kpiCode && !Number.isNaN(value)) {
      current.metrics.push({
        code: kpiCode,
        value,
        unit: stringCell(row, 6),
        publishedAt,
      });
    }
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

    const current = bySource.get(sourceReportId) || { occupancy: null, leads: null, lastUpdate: '--', metrics: [] };
    const value = Number(row[5]);
    const code = stringCell(row, 4);
    const publishedAt = stringCell(row, 8) || current.lastUpdate;
    if (code === 'OCCUPANCY' && !Number.isNaN(value)) current.occupancy = value;
    if (code === 'LEADS' && !Number.isNaN(value)) current.leads = value;
    if (code && !Number.isNaN(value)) {
      current.metrics.push({
        code,
        value,
        unit: stringCell(row, 6),
        publishedAt,
      });
    }
    current.lastUpdate = publishedAt;
    bySource.set(sourceReportId, current);
  }

  return bySource;
}

export function buildDashboardExtrasFromRows(
  expectedRows: unknown[][],
  kpiRows: unknown[][],
  exceptionRows: unknown[][]
): Pick<DashboardData, 'financialMetrics' | 'reportHealth' | 'exceptions' | 'lateReports'> {
  const financialCodes = new Set(['REVENUE', 'EXPENSES', 'NOI', 'CASH_BALANCE', 'DELINQUENCY', 'BUDGET_VARIANCE']);
  const financialMetrics: FinancialMetric[] = [];
  const reportHealth: ReportHealth = { received: 0, missing: 0, waiting: 0, late: 0 };
  const lateReports: LateReport[] = [];

  for (let i = 1; i < kpiRows.length; i++) {
    const row = kpiRows[i];
    const code = stringCell(row, 4).trim().toUpperCase().replace(/\s+/g, '_');
    const value = Number(row[5]);
    if (!financialCodes.has(code) || Number.isNaN(value)) continue;

    financialMetrics.push({
      id: stringCell(row, 0),
      propertyId: stringCell(row, 1),
      periodStart: stringCell(row, 2),
      periodEnd: stringCell(row, 3),
      code,
      value,
      unit: stringCell(row, 6),
      sourceReportId: stringCell(row, 7),
      publishedAt: stringCell(row, 8),
    });
  }

  for (let i = 1; i < expectedRows.length; i++) {
    const row = expectedRows[i];
    const status = stringCell(row, 6);
    if (status === 'RECEIVED') reportHealth.received++;
    if (status === 'MISSING') reportHealth.missing++;
    if (status === 'WAITING') reportHealth.waiting++;
    if (boolCell(row, 8)) {
      reportHealth.late++;
      lateReports.push({
        id: stringCell(row, 0),
        propertyId: stringCell(row, 1),
        reportDefinitionId: stringCell(row, 2),
        periodStart: stringCell(row, 3),
        periodEnd: stringCell(row, 4),
        deadline: stringCell(row, 5),
        status,
      });
    }
  }

  const exceptions: DashboardException[] = exceptionRows.slice(1)
    .filter(row => stringCell(row, 5).toUpperCase() !== 'RESOLVED')
    .map(row => ({
      id: stringCell(row, 0),
      documentId: stringCell(row, 1),
      stage: stringCell(row, 2),
      error: stringCell(row, 3),
      severity: stringCell(row, 4),
      status: stringCell(row, 5),
      assignee: stringCell(row, 6),
      createdAt: stringCell(row, 7),
    }));

  return { financialMetrics, reportHealth, exceptions, lateReports };
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

export function buildUserAccessFromRows(userRows: unknown[][], currentEmail: string): UserAccess {
  const email = normalizeEmail(currentEmail);
  const activeUsers = userRows.slice(1).filter(row => normalizeEmail(stringCell(row, 3)) === 'true');

  if (activeUsers.length === 0) {
    return { email, role: 'setup', allowedPropertyIds: [] };
  }

  const user = activeUsers.find(row => normalizeEmail(stringCell(row, 0)) === email);
  if (!user) {
    throw new Error(`Access denied for ${currentEmail}. Add this email as active in the Users sheet.`);
  }

  return {
    email,
    role: normalizeRole(stringCell(user, 1)),
    allowedPropertyIds: parseAllowedPropertyIds(stringCell(user, 2)),
  };
}

export function filterDashboardDataForAccess(data: DashboardData, access: UserAccess): DashboardData {
  if (access.allowedPropertyIds.length === 0) return data;
  const allowed = new Set(access.allowedPropertyIds);
  const timeline = data.timeline.filter(event => allowed.has(event.propertyId));

  return {
    ...data,
    properties: data.properties.filter(property => allowed.has(property.id)),
    portfolio: data.portfolio.filter(property => allowed.has(property.id)),
    timeline,
    financialMetrics: data.financialMetrics.filter(metric => allowed.has(metric.propertyId)),
    lateReports: data.lateReports.filter(report => allowed.has(report.propertyId)),
    reportHealth: buildReportHealthFromTimeline(timeline),
  };
}

function buildReportHealthFromTimeline(timeline: ReportTimelineEvent[]): ReportHealth {
  return timeline.reduce<ReportHealth>((health, event) => {
    if (event.status === 'RECEIVED') health.received++;
    if (event.status === 'MISSING') health.missing++;
    if (event.status === 'WAITING') health.waiting++;
    if (event.late) health.late++;
    return health;
  }, { received: 0, missing: 0, waiting: 0, late: 0 });
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
      const kpi = kpisBySource.get(receivedReportId) || { occupancy: null, leads: null, lastUpdate: '--', metrics: [] };

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
        metrics: kpi.metrics,
      };
    })
    .sort((a, b) => b.deadline.localeCompare(a.deadline));
}

export function getPortfolioSummary(): PortfolioProperty[] {
  const ss = getConfiguredSpreadsheet();
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

function getUserAccess(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): UserAccess {
  const usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) return { email: normalizeEmail(getCurrentUser()), role: 'setup', allowedPropertyIds: [] };

  return buildUserAccessFromRows(usersSheet.getDataRange().getValues(), getCurrentUser());
}

export function getPropertyList(): Array<{ id: string; name: string }> {
  const ss = getConfiguredSpreadsheet();
  const sheet = ss.getSheetByName('Properties');
  if (!sheet) return [];

  return buildPropertyListFromRows(sheet.getDataRange().getValues());
}

export function getReportTimeline(propertyId?: string): ReportTimelineEvent[] {
  const ss = getConfiguredSpreadsheet();
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
  const ss = getConfiguredSpreadsheet();
  const access = getUserAccess(ss);
  const expectedSheet = ss.getSheetByName('ExpectedReports');
  const kpiSheet = ss.getSheetByName('KPIHistory');
  const exceptionsSheet = ss.getSheetByName('ExceptionQueue');
  const extras = buildDashboardExtrasFromRows(
    expectedSheet ? expectedSheet.getDataRange().getValues() : [[]],
    kpiSheet ? kpiSheet.getDataRange().getValues() : [[]],
    exceptionsSheet ? exceptionsSheet.getDataRange().getValues() : [[]]
  );
  const data = {
    user: getCurrentUser(),
    role: access.role,
    capabilities: {
      canSync: canSyncReports(access.role),
      canManageAdmin: canManageAdmin(access.role),
      canViewPortfolio: canViewPortfolio(access.role),
    },
    properties: getPropertyList(),
    portfolio: getPortfolioSummary(),
    timeline: getReportTimeline(propertyId),
    ...extras,
  };

  return filterDashboardDataForAccess(data, access);
}

export function syncReportsNow(): SyncReportsResult {
  const ss = getConfiguredSpreadsheet();
  const access = getUserAccess(ss);
  if (!canSyncReports(access.role)) {
    throw new Error(`Access denied for ${access.email}. This role can view the dashboard but cannot sync reports.`);
  }

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
      audit: requireSheetByName(ss, 'AuditLog'),
    },
    {
      rootFolderId,
      actorEmail: access.email,
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
