import { createAuditLogEntry, writeAuditLog } from '../audit/audit-log';
import { validatePropertyConfig, validateReportDefinition, validateUser, collectAllValidationIssues } from './validation';

export interface ConfigChange {
  actor: string;
  entity: string;
  entityId: string;
  oldValue: string;
  newValue: string;
}

function logChange(
  auditSheet: GoogleAppsScript.Spreadsheet.Sheet,
  change: ConfigChange,
  action: string
): void {
  const entry = createAuditLogEntry({
    actor: change.actor,
    action,
    entity: change.entity,
    entityId: change.entityId,
    oldValue: change.oldValue,
    newValue: change.newValue,
  });
  writeAuditLog(auditSheet, entry);
}

export function applyPropertyConfigChange(
  auditSheet: GoogleAppsScript.Spreadsheet.Sheet,
  change: ConfigChange
): { success: boolean; errors: string[] } {
  const parsed = JSON.parse(change.newValue);
  const issues = validatePropertyConfig({
    id: parsed.id || change.entityId,
    code: parsed.code || '',
    name: parsed.name || '',
    status: parsed.status || '',
    timezone: parsed.timezone || '',
  });
  const { errors } = collectAllValidationIssues([issues]);

  if (errors.length > 0) {
    return { success: false, errors: errors.map(e => e.message) };
  }

  logChange(auditSheet, change, 'PROPERTY_UPDATE');
  return { success: true, errors: [] };
}

export function applyReportDefinitionChange(
  auditSheet: GoogleAppsScript.Spreadsheet.Sheet,
  change: ConfigChange
): { success: boolean; errors: string[] } {
  const parsed = JSON.parse(change.newValue);
  const issues = validateReportDefinition({
    id: parsed.id || change.entityId,
    propertyId: parsed.propertyId || '',
    type: parsed.type || '',
    frequency: parsed.frequency || '',
    parserKey: parsed.parserKey || '',
    authorizedSenders: parsed.authorizedSenders || '',
    deadlineRule: parsed.deadlineRule || '',
  });
  const { errors } = collectAllValidationIssues([issues]);

  if (errors.length > 0) {
    return { success: false, errors: errors.map(e => e.message) };
  }

  logChange(auditSheet, change, 'DEFINITION_UPDATE');
  return { success: true, errors: [] };
}

export function applyUserChange(
  auditSheet: GoogleAppsScript.Spreadsheet.Sheet,
  change: ConfigChange
): { success: boolean; errors: string[] } {
  const parsed = JSON.parse(change.newValue);
  const issues = validateUser({
    email: parsed.email || change.entityId,
    role: parsed.role || '',
    allowedPropertyId: parsed.allowedPropertyId || '',
  });
  const { errors } = collectAllValidationIssues([issues]);

  if (errors.length > 0) {
    return { success: false, errors: errors.map(e => e.message) };
  }

  logChange(auditSheet, change, 'USER_UPDATE');
  return { success: true, errors: [] };
}
