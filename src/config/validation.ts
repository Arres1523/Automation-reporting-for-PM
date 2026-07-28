import { STATUS } from '../domain/constants';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export function validatePropertyConfig(property: {
  id: string;
  code: string;
  name: string;
  status: string;
  timezone: string;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!property.id) issues.push({ field: 'id', message: 'Property ID is required', severity: 'ERROR' });
  if (!property.code) issues.push({ field: 'code', message: 'Property code is required', severity: 'ERROR' });
  if (!property.name) issues.push({ field: 'name', message: 'Property name is required', severity: 'ERROR' });
  if (!property.timezone) issues.push({ field: 'timezone', message: 'Timezone is required', severity: 'ERROR' });

  const validStatuses = ['active', 'inactive'];
  if (property.status && !validStatuses.includes(property.status.toLowerCase())) {
    issues.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}`, severity: 'WARNING' });
  }

  return issues;
}

export function validateReportDefinition(def: {
  id: string;
  propertyId: string;
  type: string;
  frequency: string;
  parserKey: string;
  authorizedSenders: string;
  deadlineRule: string;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!def.id) issues.push({ field: 'id', message: 'Definition ID is required', severity: 'ERROR' });
  if (!def.propertyId) issues.push({ field: 'propertyId', message: 'Property ID is required', severity: 'ERROR' });
  if (!def.type) issues.push({ field: 'type', message: 'Report type is required', severity: 'ERROR' });
  if (!def.frequency) issues.push({ field: 'frequency', message: 'Frequency is required', severity: 'ERROR' });
  if (!def.parserKey) issues.push({ field: 'parserKey', message: 'Parser key is required', severity: 'ERROR' });
  if (!def.authorizedSenders) issues.push({ field: 'authorizedSenders', message: 'At least one authorized sender is required', severity: 'ERROR' });
  if (!def.deadlineRule) issues.push({ field: 'deadlineRule', message: 'Deadline rule is required', severity: 'ERROR' });

  const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY'];
  if (def.frequency && !validFrequencies.includes(def.frequency.toUpperCase())) {
    issues.push({ field: 'frequency', message: `Frequency must be one of: ${validFrequencies.join(', ')}`, severity: 'ERROR' });
  }

  return issues;
}

export function validateExpectedReport(report: {
  id: string;
  propertyId: string;
  reportDefinitionId: string;
  periodStart: string;
  deadline: string;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!report.id) issues.push({ field: 'id', message: 'Expected report ID is required', severity: 'ERROR' });
  if (!report.propertyId) issues.push({ field: 'propertyId', message: 'Property ID is required', severity: 'ERROR' });
  if (!report.reportDefinitionId) issues.push({ field: 'reportDefinitionId', message: 'Report definition ID is required', severity: 'ERROR' });
  if (!report.periodStart) issues.push({ field: 'periodStart', message: 'Period start is required', severity: 'ERROR' });
  if (!report.deadline) issues.push({ field: 'deadline', message: 'Deadline is required', severity: 'ERROR' });

  if (report.periodStart && isNaN(Date.parse(report.periodStart))) {
    issues.push({ field: 'periodStart', message: 'Period start must be a valid ISO date', severity: 'ERROR' });
  }

  if (report.deadline && isNaN(Date.parse(report.deadline))) {
    issues.push({ field: 'deadline', message: 'Deadline must be a valid ISO date', severity: 'ERROR' });
  }

  return issues;
}

export function validateUser(user: {
  email: string;
  role: string;
  allowedPropertyIds?: string;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!user.email) issues.push({ field: 'email', message: 'Email is required', severity: 'ERROR' });
  if (!user.role) issues.push({ field: 'role', message: 'Role is required', severity: 'ERROR' });

  const validRoles = ['admin', 'asset_management', 'data_analyst', 'pm', 'owner'];
  const normalizedRole = user.role.trim().toLowerCase().replace(/\s+/g, '_');
  if (user.role && !validRoles.includes(normalizedRole)) {
    issues.push({ field: 'role', message: `Role must be one of: ${validRoles.join(', ')}`, severity: 'ERROR' });
  }

  if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    issues.push({ field: 'email', message: 'Email must be a valid email address', severity: 'ERROR' });
  }

  return issues;
}

export function validateUniqueIds(
  ids: string[],
  label: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, number>();

  ids.forEach((id, i) => {
    if (seen.has(id)) {
      issues.push({
        field: `${label}[${i}]`,
        message: `Duplicate ID: "${id}" also appears at index ${seen.get(id)}`,
        severity: 'ERROR',
      });
    } else {
      seen.set(id, i);
    }
  });

  return issues;
}

export function collectAllValidationIssues(
  validations: ValidationIssue[][]
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  for (const group of validations) {
    for (const issue of group) {
      if (issue.severity === 'ERROR') errors.push(issue);
      else warnings.push(issue);
    }
  }

  return { errors, warnings };
}

export function isConfigValid(issues: ValidationIssue[]): boolean {
  return issues.every(i => i.severity !== 'ERROR');
}
