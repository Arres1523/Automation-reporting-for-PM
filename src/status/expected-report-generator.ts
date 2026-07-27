import { EXPECTED_REPORT_WINDOWS } from '../domain/constants';
import { buildExpectedReportId } from '../domain/identity';

export interface ReportDefinitionForGeneration {
  id: string;
  propertyId: string;
  frequency: string;
}

export interface ExpectedReportToCreate {
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

function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDefaultDeadline(periodStart: string, frequency: string): string {
  const [y, m, d] = periodStart.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  switch (frequency) {
    case 'DAILY':
      return formatDate(addDays(start, 1));
    case 'WEEKLY':
      return formatDate(addDays(start, 3));
    case 'MONTHLY':
      return formatDate(addDays(start, 5));
    default:
      return formatDate(addDays(start, 1));
  }
}

export function generateExpectedReports(
  definitions: ReportDefinitionForGeneration[],
  now: Date = new Date()
): ExpectedReportToCreate[] {
  const reports: ExpectedReportToCreate[] = [];

  for (const def of definitions) {
    const periods = getPeriodsToGenerate(def.frequency, now);

    for (const { periodStart, periodEnd } of periods) {
      const id = buildExpectedReportId(def.propertyId, def.id, periodStart);
      const deadline = getDefaultDeadline(periodStart, def.frequency);

      reports.push({
        id,
        propertyId: def.propertyId,
        reportDefinitionId: def.id,
        periodStart,
        periodEnd,
        deadline,
        status: 'WAITING',
        receivedReportId: '',
        late: 'false',
        reminderDates: '',
      });
    }
  }

  return reports;
}

export function getPeriodsToGenerate(
  frequency: string,
  now: Date = new Date()
): Array<{ periodStart: string; periodEnd: string }> {
  const periods: Array<{ periodStart: string; periodEnd: string }> = [];

  switch (frequency.toUpperCase()) {
    case 'DAILY': {
      for (let i = 0; i < EXPECTED_REPORT_WINDOWS.DAILY_DAYS; i++) {
        const start = addDays(now, i);
        const end = addDays(now, i);
        periods.push({ periodStart: formatDate(start), periodEnd: formatDate(end) });
      }
      break;
    }
    case 'WEEKLY': {
      const monday = getMonday(now);
      for (let i = 0; i < EXPECTED_REPORT_WINDOWS.WEEKLY_WEEKS; i++) {
        const start = addWeeks(monday, i);
        const end = addDays(addWeeks(monday, i), 6);
        periods.push({ periodStart: formatDate(start), periodEnd: formatDate(end) });
      }
      break;
    }
    case 'MONTHLY': {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      for (let i = 0; i < EXPECTED_REPORT_WINDOWS.MONTHLY_MONTHS; i++) {
        const start = new Date(firstOfMonth);
        start.setMonth(start.getMonth() + i);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        periods.push({ periodStart: formatDate(start), periodEnd: formatDate(end) });
      }
      break;
    }
  }

  return periods;
}

export function deduplicateReports(
  reports: ExpectedReportToCreate[],
  existingIds: string[]
): ExpectedReportToCreate[] {
  return reports.filter(r => !existingIds.includes(r.id));
}
