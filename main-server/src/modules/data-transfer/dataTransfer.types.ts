export type TransferValueType = 'boolean' | 'date' | 'number' | 'text';

export interface TransferColumn {
  header: string;
  key: string;
  required?: boolean;
  type?: TransferValueType;
}

export interface TransferSheetDefinition {
  columns: TransferColumn[];
  name: string;
}

export interface TransferDefinition {
  filename: string;
  resource: string;
  sheets: TransferSheetDefinition[];
}

export interface TransferImportResult {
  created: number;
  errors: string[];
  processed: number;
  skipped: number;
  updated: number;
}

export type TransferRows = Record<string, Array<Record<string, unknown>>>;
