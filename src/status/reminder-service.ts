import { STATUS, REMINDER_ESCALATION_HOURS } from '../domain/constants';
import { buildReminderId } from '../domain/identity';

export interface ReminderRequest {
  expectedReportId: string;
  propertyId: string;
  reportType: string;
  periodStart: string;
  deadline: string;
  recipientEmail: string;
}

export function buildReminderSubject(propertyId: string, reportType: string, periodStart: string): string {
  return `[Valoris] Report MISSING: ${propertyId} - ${reportType} - ${periodStart}`;
}

export function buildReminderBody(
  propertyId: string,
  reportType: string,
  periodStart: string,
  deadline: string,
  isEscalation: boolean
): string {
  const prefix = isEscalation ? 'ESCALATION: ' : '';
  return [
    `${prefix}Report Status: MISSING`,
    ``,
    `Property: ${propertyId}`,
    `Report Type: ${reportType}`,
    `Period: ${periodStart}`,
    `Deadline was: ${deadline}`,
    ``,
    isEscalation
      ? 'This report is now more than 24 hours past due. Asset Management has been notified.'
      : 'Please submit the required report as soon as possible.',
    ``,
    'This is an automated message from the Valoris Reporting System.',
  ].join('\n');
}

export function sendReminder(
  request: ReminderRequest,
  isEscalation: boolean
): { reminderId: string; sent: boolean; messageId?: string } {
  const reminderId = buildReminderId(request.expectedReportId, isEscalation ? 'ESCALATION' : 'INITIAL');

  try {
    const subject = buildReminderSubject(request.propertyId, request.reportType, request.periodStart);
    const body = buildReminderBody(request.propertyId, request.reportType, request.periodStart, request.deadline, isEscalation);

    GmailApp.sendEmail(request.recipientEmail, subject, body);

    return { reminderId, sent: true };
  } catch (e) {
    return { reminderId, sent: false };
  }
}

export function checkAndSendReminders(
  expectedSheet: GoogleAppsScript.Spreadsheet.Sheet,
  reminderLogSheet: GoogleAppsScript.Spreadsheet.Sheet,
  config: {
    defaultRecipient: string;
    escalationRecipient: string;
  }
): Array<{ expectedReportId: string; type: string; sent: boolean }> {
  const data = expectedSheet.getDataRange().getValues();
  const results: Array<{ expectedReportId: string; type: string; sent: boolean }> = [];

  // Read existing reminder log to avoid duplicates
  const reminderData = reminderLogSheet.getDataRange().getValues();
  const sentReminders = new Set<string>();
  for (let i = 1; i < reminderData.length; i++) {
    sentReminders.add(String(reminderData[i][1]));
  }

  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const expectedReportId = String(row[0]);
    const deadline = String(row[5]);
    const currentStatus = String(row[6]);

    if (currentStatus !== STATUS.MISSING) continue;
    if (!deadline) continue;

    const deadlineDate = new Date(deadline);
    const hoursSinceDeadline = (now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60);

    // Initial reminder
    const initialId = buildReminderId(expectedReportId, 'INITIAL');
    if (!sentReminders.has(initialId) && hoursSinceDeadline >= 0) {
      const request: ReminderRequest = {
        expectedReportId,
        propertyId: String(row[1]),
        reportType: String(row[2]),
        periodStart: String(row[3]),
        deadline,
        recipientEmail: config.defaultRecipient,
      };

      const result = sendReminder(request, false);
      reminderLogSheet.appendRow([initialId, expectedReportId, 'INITIAL', config.defaultRecipient, now.toISOString(), result.sent ? 'SENT' : 'FAILED', '']);
      results.push({ expectedReportId, type: 'INITIAL', sent: result.sent });
      sentReminders.add(initialId);
    }

    // Escalation after 24 hours
    const escalationId = buildReminderId(expectedReportId, 'ESCALATION');
    if (!sentReminders.has(escalationId) && hoursSinceDeadline >= REMINDER_ESCALATION_HOURS) {
      const request: ReminderRequest = {
        expectedReportId,
        propertyId: String(row[1]),
        reportType: String(row[2]),
        periodStart: String(row[3]),
        deadline,
        recipientEmail: config.escalationRecipient,
      };

      const result = sendReminder(request, true);
      reminderLogSheet.appendRow([escalationId, expectedReportId, 'ESCALATION', config.escalationRecipient, now.toISOString(), result.sent ? 'SENT' : 'FAILED', '']);
      results.push({ expectedReportId, type: 'ESCALATION', sent: result.sent });
      sentReminders.add(escalationId);
    }
  }

  return results;
}
