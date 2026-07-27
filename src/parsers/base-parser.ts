import type { ParsedReport } from '../domain/types';

export interface Parser {
  parserKey: string;
  canParse(fileName: string, mimeType: string): boolean;
  parse(fileBlob: GoogleAppsScript.Base.Blob): ParsedReport;
}

export interface ParserConfig {
  parserKey: string;
  filePatterns: Array<{ namePattern: string; mimeTypes: string[] }>;
}
