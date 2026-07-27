import type { ReportStatus } from '../domain/types';
import { STATUS, REMINDER_ESCALATION_HOURS } from '../domain/constants';

export interface StatusTransition {
  expectedReportId: string;
  from: ReportStatus;
  to: ReportStatus;
  late: boolean;
  triggeredAt: string;
}

export function evaluateStatus(
  deadline: string,
  hasValidReport: boolean,
  receivedAt: string | null,
  now: Date = new Date()
): { status: ReportStatus; late: boolean; transition?: StatusTransition } {
  const deadlineDate = new Date(deadline);
  const currentStatus: ReportStatus = hasValidReport ? STATUS.RECEIVED : STATUS.WAITING;

  if (hasValidReport && receivedAt) {
    const receivedDate = new Date(receivedAt);
    const late = receivedDate > deadlineDate;

    if (currentStatus === STATUS.RECEIVED) {
      return { status: STATUS.RECEIVED, late };
    }
  }

  if (!hasValidReport && now > deadlineDate) {
    return {
      status: STATUS.MISSING,
      late: false,
      transition: {
        expectedReportId: '',
        from: STATUS.WAITING,
        to: STATUS.MISSING,
        late: false,
        triggeredAt: now.toISOString(),
      },
    };
  }

  return { status: STATUS.WAITING, late: false };
}

export function evaluateReportStatuses(
  expectedSheet: GoogleAppsScript.Spreadsheet.Sheet
): StatusTransition[] {
  const data = expectedSheet.getDataRange().getValues();
  const transitions: StatusTransition[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;

    const expectedReportId = String(row[0]);
    const deadline = String(row[5]);
    const currentStatus = String(row[6]) as ReportStatus;
    const receivedReportId = String(row[7]);
    const receivedAt = receivedReportId ? getReceivedAt(receivedReportId) : null;

    if (!deadline) continue;

    const result = evaluateStatus(deadline, !!receivedReportId, receivedAt);

    if (result.transition) {
      result.transition.expectedReportId = expectedReportId;
      expectedSheet.getRange(rowNum, 7).setValue(result.transition.to);
      transitions.push(result.transition);
    }
  }

  return transitions;
}

function getReceivedAt(receivedReportId: string): string | null {
  // This would look up the ReceivedReports sheet
  // For now, return null — Apps Script integration handles this at runtime
  return null;
}
