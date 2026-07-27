export interface AuditLogEntry {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

const LOG_HEADERS = [
  'actor',
  'action',
  'entity',
  'entityId',
  'oldValue',
  'newValue',
  'timestamp',
];

export function createAuditLogEntry(params: Omit<AuditLogEntry, 'timestamp'>): AuditLogEntry {
  return {
    ...params,
    timestamp: new Date().toISOString(),
  };
}

export function writeAuditLog(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  entry: AuditLogEntry
): void {
  const values = [[
    entry.actor,
    entry.action,
    entry.entity,
    entry.entityId,
    entry.oldValue,
    entry.newValue,
    entry.timestamp,
  ]];
  sheet.appendRow(values[0]);
}

export function queryAuditLog(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  options?: { actor?: string; action?: string; limit?: number }
): AuditLogEntry[] {
  const data = sheet.getDataRange().getValues();
  const rows: AuditLogEntry[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const entry: AuditLogEntry = {
      actor: row[0],
      action: row[1],
      entity: row[2],
      entityId: row[3],
      oldValue: row[4],
      newValue: row[5],
      timestamp: row[6],
    };

    if (options?.actor && entry.actor !== options.actor) continue;
    if (options?.action && entry.action !== options.action) continue;

    rows.push(entry);

    if (options?.limit && rows.length >= options.limit) break;
  }

  return rows;
}
