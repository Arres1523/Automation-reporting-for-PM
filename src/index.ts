function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutput('<h1>Valoris Reporting MVP</h1>');
}

function onInstall(): void {}

export { doGet, onInstall };
