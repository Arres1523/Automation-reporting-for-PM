export function renderHealthPage(): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile('web/health');
  template.version = '0.1.0';
  template.timestamp = new Date().toISOString();
  return template.evaluate().setTitle('Valoris Reporting MVP');
}
