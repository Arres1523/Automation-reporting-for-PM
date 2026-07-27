import { ClassificationRule } from '../classification/classifier';
import { ALL_TABLES } from '../config/table-headers';
import { ensureSheetsExist } from '../config/sheet-init';
import { processInbox } from '../intake/intake-orchestrator';
import { extendExpectedReportWindows } from '../status/calendar-extension';
import { evaluateReportStatuses } from '../status/status-engine';
import { TRIGGER_INTERVALS } from '../domain/constants';

export interface TriggerSpec {
  handlerName: string;
  everyMinutes?: number;
  everyHours?: number;
}

export function requireSheetByName(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Missing required sheet: ${sheetName}`);
  }
  return sheet;
}

export function buildClassificationRulesFromRows(rows: unknown[][]): ClassificationRule[] {
  return rows.slice(1)
    .filter(row => String(row[0] || '').trim())
    .map(row => ({
      reportDefinitionId: String(row[0]),
      propertyId: String(row[1]),
      senderPattern: String(row[4] || '.*'),
      subjectPattern: String(row[5] || '.*'),
      fileNamePattern: String(row[6] || '.*'),
      frequency: String(row[3]),
    }));
}

export function getTriggerSpecs(): TriggerSpec[] {
  return [
    { handlerName: 'processIntake', everyMinutes: TRIGGER_INTERVALS.INTAKE_MINUTES },
    { handlerName: 'evaluateStatuses', everyHours: TRIGGER_INTERVALS.STATUS_HOURS },
    { handlerName: 'extendCalendar', everyHours: TRIGGER_INTERVALS.CALENDAR_HOURS },
  ];
}

export function getConfiguredSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!activeSpreadsheet) {
    throw new Error('Missing script property: SPREADSHEET_ID');
  }

  return activeSpreadsheet;
}

export function setupSpreadsheet(): string {
  const spreadsheet = getConfiguredSpreadsheet();
  ensureSheetsExist(spreadsheet);
  return spreadsheet.getId();
}

export function processIntake(): GoogleAppsScript.Content.TextOutput {
  const spreadsheet = getConfiguredSpreadsheet();
  const reportDefinitionsSheet = requireSheetByName(spreadsheet, 'ReportDefinitions');
  const rules = buildClassificationRulesFromRows(reportDefinitionsSheet.getDataRange().getValues());
  const result = processInbox(
    rules,
    {
      received: requireSheetByName(spreadsheet, 'ReceivedReports'),
      exceptions: requireSheetByName(spreadsheet, 'ExceptionQueue'),
    },
    {
      rootFolderId: PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_FOLDER_ID') || '',
    }
  );

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

export function evaluateStatuses(): GoogleAppsScript.Content.TextOutput {
  const spreadsheet = getConfiguredSpreadsheet();
  const transitions = evaluateReportStatuses(requireSheetByName(spreadsheet, 'ExpectedReports'));

  return ContentService.createTextOutput(JSON.stringify({ transitions }))
    .setMimeType(ContentService.MimeType.JSON);
}

export function extendCalendar(): GoogleAppsScript.Content.TextOutput {
  const spreadsheet = getConfiguredSpreadsheet();
  const created = extendExpectedReportWindows(
    requireSheetByName(spreadsheet, 'ReportDefinitions'),
    requireSheetByName(spreadsheet, 'ExpectedReports')
  );

  return ContentService.createTextOutput(JSON.stringify({ created }))
    .setMimeType(ContentService.MimeType.JSON);
}

export function installDevTriggers(): TriggerSpec[] {
  const specs = getTriggerSpecs();
  const handlerNames = new Set(specs.map(spec => spec.handlerName));

  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (handlerNames.has(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  for (const spec of specs) {
    const builder = ScriptApp.newTrigger(spec.handlerName).timeBased();
    if (spec.everyMinutes) {
      builder.everyMinutes(spec.everyMinutes).create();
    } else if (spec.everyHours) {
      builder.everyHours(spec.everyHours).create();
    }
  }

  return specs;
}

export function assertRequiredTablesConfigured(): string[] {
  return Object.keys(ALL_TABLES);
}
