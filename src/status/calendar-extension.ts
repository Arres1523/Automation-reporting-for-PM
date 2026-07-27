import {
  generateExpectedReports,
  deduplicateReports,
  ExpectedReportToCreate,
} from './expected-report-generator';

export function extendExpectedReportWindows(
  definitionsSheet: GoogleAppsScript.Spreadsheet.Sheet,
  expectedSheet: GoogleAppsScript.Spreadsheet.Sheet
): ExpectedReportToCreate[] {
  const defData = definitionsSheet.getDataRange().getValues();
  const definitions: Array<{ id: string; propertyId: string; frequency: string }> = [];

  for (let i = 1; i < defData.length; i++) {
    const row = defData[i];
    if (row[0]) {
      definitions.push({
        id: String(row[0]),
        propertyId: String(row[1]),
        frequency: String(row[3]),
      });
    }
  }

  const expectedData = expectedSheet.getDataRange().getValues();
  const existingIds: string[] = [];

  for (let i = 1; i < expectedData.length; i++) {
    if (expectedData[i][0]) {
      existingIds.push(String(expectedData[i][0]));
    }
  }

  const allNew = generateExpectedReports(definitions);
  const toInsert = deduplicateReports(allNew, existingIds);

  for (const report of toInsert) {
    expectedSheet.appendRow([
      report.id,
      report.propertyId,
      report.reportDefinitionId,
      report.periodStart,
      report.periodEnd,
      report.deadline,
      report.status,
      report.receivedReportId,
      report.late,
      report.reminderDates,
    ]);
  }

  return toInsert;
}
