import { renderApp } from './web/app-server';
import {
  evaluateStatuses,
  extendCalendar,
  installDevTriggers,
  processIntake,
  setupSpreadsheet,
} from './runtime/app-script-runtime';

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return renderApp();
}

function onInstall(): void {
}

const appsScriptGlobals = globalThis as unknown as Record<string, unknown>;

appsScriptGlobals.doGet = doGet;
appsScriptGlobals.onInstall = onInstall;
appsScriptGlobals.setupSpreadsheet = setupSpreadsheet;
appsScriptGlobals.processIntake = processIntake;
appsScriptGlobals.evaluateStatuses = evaluateStatuses;
appsScriptGlobals.extendCalendar = extendCalendar;
appsScriptGlobals.installDevTriggers = installDevTriggers;

export { doGet, onInstall };
