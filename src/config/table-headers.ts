export const PROPERTIES_HEADERS = [
  'id', 'code', 'name', 'status', 'timezone', 'driveFolderId', 'contacts',
] as const;

export const REPORT_DEFINITIONS_HEADERS = [
  'id', 'propertyId', 'type', 'frequency', 'parserKey', 'authorizedSenders',
  'deadlineRule', 'escalationRecipients',
] as const;

export const EXPECTED_REPORTS_HEADERS = [
  'id', 'propertyId', 'reportDefinitionId', 'periodStart', 'periodEnd',
  'deadline', 'status', 'receivedReportId', 'late', 'reminderDates',
] as const;

export const RECEIVED_REPORTS_HEADERS = [
  'id', 'messageId', 'fileHash', 'receivedAt', 'propertyId',
  'reportDefinitionId', 'periodStart', 'driveLink', 'classification', 'actorEmail',
] as const;

export const KPI_HISTORY_HEADERS = [
  'id', 'propertyId', 'periodStart', 'periodEnd', 'kpiCode', 'value',
  'unit', 'sourceReportId', 'publishedAt',
] as const;

export const REMINDER_LOG_HEADERS = [
  'id', 'expectedReportId', 'type', 'recipients', 'sentAt', 'result', 'messageId',
] as const;

export const EXCEPTION_QUEUE_HEADERS = [
  'id', 'documentId', 'stage', 'error', 'severity', 'status', 'assignee', 'createdAt',
] as const;

export const AUDIT_LOG_HEADERS = [
  'actor', 'action', 'entity', 'entityId', 'oldValue', 'newValue', 'timestamp',
] as const;

export const USERS_HEADERS = [
  'email', 'role', 'allowedPropertyIds', 'active',
] as const;

export const ALL_TABLES: Record<string, readonly string[]> = {
  Properties: PROPERTIES_HEADERS,
  ReportDefinitions: REPORT_DEFINITIONS_HEADERS,
  ExpectedReports: EXPECTED_REPORTS_HEADERS,
  ReceivedReports: RECEIVED_REPORTS_HEADERS,
  KPIHistory: KPI_HISTORY_HEADERS,
  ReminderLog: REMINDER_LOG_HEADERS,
  ExceptionQueue: EXCEPTION_QUEUE_HEADERS,
  AuditLog: AUDIT_LOG_HEADERS,
  Users: USERS_HEADERS,
};
