import { ALL_TABLES } from './table-headers';

export function ensureSheetsExist(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): void {
  const existing = spreadsheet.getSheets().map(s => s.getName());

  for (const [name, headers] of Object.entries(ALL_TABLES)) {
    if (!existing.includes(name)) {
      const sheet = spreadsheet.insertSheet(name);
      sheet.appendRow(headers as unknown as string[]);
      sheet.setFrozenRows(1);
    }
  }
}
