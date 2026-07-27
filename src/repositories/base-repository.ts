export class SheetRepository<T extends Record<string, unknown>> {
  protected headers: string[];
  protected idColumn: string;

  constructor(headers: string[], idColumn: string) {
    this.headers = headers;
    this.idColumn = idColumn;
  }

  protected rowToEntity(row: unknown[]): T {
    const entity: Record<string, unknown> = {};
    this.headers.forEach((header, i) => {
      entity[header] = row[i];
    });
    return entity as T;
  }

  protected entityToRow(entity: T): unknown[] {
    return this.headers.map((header) => entity[header]);
  }

  findById(sheet: GoogleAppsScript.Spreadsheet.Sheet, id: string): T | null {
    const data = sheet.getDataRange().getValues();
    const idIndex = this.headers.indexOf(this.idColumn);
    if (idIndex < 0) return null;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === id) {
        return this.rowToEntity(data[i]);
      }
    }
    return null;
  }

  findAll(sheet: GoogleAppsScript.Spreadsheet.Sheet): T[] {
    const data = sheet.getDataRange().getValues();
    const entities: T[] = [];
    for (let i = 1; i < data.length; i++) {
      entities.push(this.rowToEntity(data[i]));
    }
    return entities;
  }

  save(sheet: GoogleAppsScript.Spreadsheet.Sheet, entity: T): void {
    sheet.appendRow(this.entityToRow(entity));
  }

  deleteById(sheet: GoogleAppsScript.Spreadsheet.Sheet, id: string): boolean {
    const data = sheet.getDataRange().getValues();
    const idIndex = this.headers.indexOf(this.idColumn);
    if (idIndex < 0) return false;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === id) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  }
}
