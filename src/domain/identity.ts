export function buildExpectedReportId(
  propertyId: string,
  reportDefinitionId: string,
  periodStart: string
): string {
  return `${propertyId}_${reportDefinitionId}_${periodStart}`;
}

export function buildReceivedReportId(
  messageId: string,
  sha256: string
): string {
  const short = sha256.slice(0, 12).toLowerCase();
  return `${messageId}_${short}`;
}

export function buildKpiId(
  expectedReportId: string,
  kpiCode: string
): string {
  return `${expectedReportId}_${kpiCode}`;
}

export function buildReminderId(
  expectedReportId: string,
  reminderType: string
): string {
  return `${expectedReportId}_${reminderType}`;
}
