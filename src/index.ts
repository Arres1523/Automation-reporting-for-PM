import { renderHealthPage } from './web/main';

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return renderHealthPage();
}

function onInstall(): void {
}

export { doGet, onInstall };
