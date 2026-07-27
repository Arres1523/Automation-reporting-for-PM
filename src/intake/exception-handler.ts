export interface ExceptionLogEntry {
  id: string;
  documentId: string;
  stage: string;
  error: string;
  severity: 'ERROR' | 'WARNING';
  status: string;
  assignee: string;
  createdAt: string;
}

export function logException(
  exceptionSheet: GoogleAppsScript.Spreadsheet.Sheet,
  entry: Omit<ExceptionLogEntry, 'id' | 'createdAt' | 'status'>
): void {
  const id = `exc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const createdAt = new Date().toISOString();

  exceptionSheet.appendRow([
    id,
    entry.documentId,
    entry.stage,
    entry.error,
    entry.severity,
    'OPEN',
    entry.assignee,
    createdAt,
  ]);
}

export function resolveException(
  exceptionSheet: GoogleAppsScript.Spreadsheet.Sheet,
  exceptionId: string,
  resolution: string
): boolean {
  const data = exceptionSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === exceptionId) {
      const row = i + 1;
      exceptionSheet.getRange(row, 6).setValue('RESOLVED');
      // Append resolution note to the error field
      const currentError = String(data[i][3]);
      exceptionSheet.getRange(row, 4).setValue(`${currentError} | Resolution: ${resolution}`);
      return true;
    }
  }

  return false;
}
