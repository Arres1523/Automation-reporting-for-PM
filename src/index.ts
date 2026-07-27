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

appsScriptGlobals.__valorisReporting = {
  doGet,
  onInstall,
  setupSpreadsheet,
  processIntake,
  evaluateStatuses,
  extendCalendar,
  installDevTriggers,
  getCurrentUser,
  getPortfolioSummary,
  getPropertyList,
  getReportTimeline,
  getDashboardData,
  syncReportsNow,
};

export { doGet, onInstall };
