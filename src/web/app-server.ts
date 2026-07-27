export function renderApp(): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile('web/app');
  return template.evaluate().setTitle('Valoris Reporting MVP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

export interface PortfolioProperty {
  name: string;
  occupancy: number | null;
  leads: number | null;
  status: string;
  late: boolean;
  lastUpdate: string;
}

export function getPortfolioSummary(): PortfolioProperty[] {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const propsSheet = ss.getSheetByName('Properties');
  const kpiSheet = ss.getSheetByName('KPIHistory');

  if (!propsSheet) return [];

  const props = propsSheet.getDataRange().getValues();
  const results: PortfolioProperty[] = [];

  for (let i = 1; i < props.length; i++) {
    const row = props[i];
    if (String(row[3]).toLowerCase() !== 'active') continue;

    results.push({
      name: String(row[2]),
      occupancy: null,
      leads: null,
      status: 'WAITING',
      late: false,
      lastUpdate: '--',
    });
  }

  return results;
}

export function getCurrentUser(): string {
  return Session.getActiveUser().getEmail();
}

export function getPropertyList(): Array<{ id: string; name: string }> {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Properties');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const props: Array<{ id: string; name: string }> = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][3]).toLowerCase() === 'active') {
      props.push({ id: String(data[i][0]), name: String(data[i][2]) });
    }
  }

  return props;
}
