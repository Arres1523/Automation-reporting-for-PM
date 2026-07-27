import { SheetRepository } from './base-repository';
import {
  PROPERTIES_HEADERS,
  REPORT_DEFINITIONS_HEADERS,
  EXPECTED_REPORTS_HEADERS,
  RECEIVED_REPORTS_HEADERS,
  KPI_HISTORY_HEADERS,
  REMINDER_LOG_HEADERS,
  EXCEPTION_QUEUE_HEADERS,
  AUDIT_LOG_HEADERS,
  USERS_HEADERS,
} from '../config/table-headers';

export interface Property {
  id: string;
  code: string;
  name: string;
  status: string;
  timezone: string;
  driveFolderId: string;
  contacts: string;
}

export interface ReportDefinition {
  id: string;
  propertyId: string;
  type: string;
  frequency: string;
  parserKey: string;
  authorizedSenders: string;
  deadlineRule: string;
  escalationRecipients: string;
}

export interface ExpectedReport {
  id: string;
  propertyId: string;
  reportDefinitionId: string;
  periodStart: string;
  periodEnd: string;
  deadline: string;
  status: string;
  receivedReportId: string;
  late: string;
  reminderDates: string;
}

export interface ReceivedReport {
  id: string;
  messageId: string;
  fileHash: string;
  receivedAt: string;
  propertyId: string;
  reportDefinitionId: string;
  periodStart: string;
  driveLink: string;
  classification: string;
}

export interface KpiRecord {
  id: string;
  propertyId: string;
  periodStart: string;
  periodEnd: string;
  kpiCode: string;
  value: number;
  unit: string;
  sourceReportId: string;
  publishedAt: string;
}

export interface ReminderLogEntry {
  id: string;
  expectedReportId: string;
  type: string;
  recipients: string;
  sentAt: string;
  result: string;
  messageId: string;
}

export interface ExceptionEntry {
  id: string;
  documentId: string;
  stage: string;
  error: string;
  severity: string;
  status: string;
  assignee: string;
  createdAt: string;
}

export interface AuditEntry {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface User {
  email: string;
  role: string;
  allowedPropertyIds: string;
  active: string;
}

export class PropertiesRepository extends SheetRepository<Property> {
  constructor() {
    super([...PROPERTIES_HEADERS] as string[], 'id');
  }
}

export class ReportDefinitionsRepository extends SheetRepository<ReportDefinition> {
  constructor() {
    super([...REPORT_DEFINITIONS_HEADERS] as string[], 'id');
  }
}

export class ExpectedReportsRepository extends SheetRepository<ExpectedReport> {
  constructor() {
    super([...EXPECTED_REPORTS_HEADERS] as string[], 'id');
  }
}

export class ReceivedReportsRepository extends SheetRepository<ReceivedReport> {
  constructor() {
    super([...RECEIVED_REPORTS_HEADERS] as string[], 'id');
  }

  findByMessageId(sheet: GoogleAppsScript.Spreadsheet.Sheet, messageId: string): ReceivedReport | null {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === messageId) {
        return this['rowToEntity'](data[i]) as ReceivedReport;
      }
    }
    return null;
  }

  findByFileHash(sheet: GoogleAppsScript.Spreadsheet.Sheet, fileHash: string): ReceivedReport | null {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2]) === fileHash) {
        return this['rowToEntity'](data[i]) as ReceivedReport;
      }
    }
    return null;
  }
}

export class KpiHistoryRepository extends SheetRepository<KpiRecord> {
  constructor() {
    super([...KPI_HISTORY_HEADERS] as string[], 'id');
  }

  findByProperty(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    propertyId: string,
    limit?: number
  ): KpiRecord[] {
    const data = sheet.getDataRange().getValues();
    const results: KpiRecord[] = [];

    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if (String(row[1]) === propertyId) {
        results.push(this['rowToEntity'](row) as KpiRecord);
        if (limit && results.length >= limit) break;
      }
    }
    return results;
  }
}

export class ReminderLogRepository extends SheetRepository<ReminderLogEntry> {
  constructor() {
    super([...REMINDER_LOG_HEADERS] as string[], 'id');
  }
}

export class ExceptionQueueRepository extends SheetRepository<ExceptionEntry> {
  constructor() {
    super([...EXCEPTION_QUEUE_HEADERS] as string[], 'id');
  }
}

export class AuditLogRepository extends SheetRepository<AuditEntry> {
  constructor() {
    super([...AUDIT_LOG_HEADERS] as string[], 'actor');
  }
}

export class UsersRepository extends SheetRepository<User> {
  constructor() {
    super([...USERS_HEADERS] as string[], 'email');
  }
}
