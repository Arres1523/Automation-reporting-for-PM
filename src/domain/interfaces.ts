import type { ParsedReport, ValidationResult } from './types';

export interface Parser {
  parserKey: string;
  canParse(fileName: string, mimeType: string): boolean;
  parse(fileBlob: GoogleAppsScript.Base.Blob): ParsedReport;
}

export interface Validator {
  validate(report: ParsedReport): ValidationResult;
}

export interface Repository<T> {
  findById(id: string): T | null;
  save(entity: T): void;
  delete(id: string): void;
}

export interface ClassifierResult {
  propertyId: string | null;
  reportDefinitionId: string | null;
  periodStart: string | null;
  confidence: number;
}
