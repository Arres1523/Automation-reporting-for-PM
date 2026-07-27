export type ReportStatus = 'WAITING' | 'RECEIVED' | 'MISSING';

export type KpiCode = 'OCCUPANCY' | 'LEADS';

export type KpiUnit = 'PERCENT' | 'COUNT';

export type Severity = 'ERROR' | 'WARNING' | 'INFO';

export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Metric {
  code: KpiCode;
  value: number;
  unit: KpiUnit;
}

export interface ParsedReport {
  propertyId: string;
  reportDefinitionId: string;
  periodStart: string;
  periodEnd: string;
  metrics: Metric[];
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IdentityKeys {
  expectedReportId: string;
  receivedReportId: string;
  kpiId: string;
  reminderId: string;
}

export interface DrivePath {
  property: string;
  frequency: string;
  year: string;
  period: string;
}
