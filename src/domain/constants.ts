export const STATUS = {
  WAITING: 'WAITING' as const,
  RECEIVED: 'RECEIVED' as const,
  MISSING: 'MISSING' as const,
};

export const KPI = {
  OCCUPANCY: 'OCCUPANCY' as const,
  LEADS: 'LEADS' as const,
};

export const FREQUENCY = {
  DAILY: 'DAILY' as const,
  WEEKLY: 'WEEKLY' as const,
  MONTHLY: 'MONTHLY' as const,
};

export const VALIDATION_LIMITS = {
  OCCUPANCY_MIN: 0,
  OCCUPANCY_MAX: 100,
  LEADS_MIN: 0,
};

export const TRIGGER_INTERVALS = {
  INTAKE_MINUTES: 5,
  STATUS_HOURS: 1,
  CALENDAR_HOURS: 24,
  BACKUP_HOURS: 24,
};

export const REMINDER_ESCALATION_HOURS = 24;

export const EXPECTED_REPORT_WINDOWS = {
  DAILY_DAYS: 14,
  WEEKLY_WEEKS: 8,
  MONTHLY_MONTHS: 6,
};
