import { renderApp } from './web/app-server';

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return renderApp();
}

function onInstall(): void {
}

export { doGet, onInstall };
