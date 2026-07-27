import {
  getCurrentUser,
  getDashboardData,
  getPortfolioSummary,
  getPropertyList,
  getReportTimeline,
  renderApp,
  syncReportsNow,
} from './web/app-server';
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
appsScriptGlobals.getCurrentUser = getCurrentUser;
appsScriptGlobals.getPortfolioSummary = getPortfolioSummary;
appsScriptGlobals.getPropertyList = getPropertyList;
appsScriptGlobals.getReportTimeline = getReportTimeline;
appsScriptGlobals.getDashboardData = getDashboardData;
appsScriptGlobals.syncReportsNow = syncReportsNow;

export { doGet, onInstall };
