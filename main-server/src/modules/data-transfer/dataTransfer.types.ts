export type TransferValueType = 'boolean' | 'date' | 'number' | 'text';

export interface TransferColumn {
  allowedValues?: readonly string[];
  defaultValue?: string;
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

export interface RowValidationResult {
  rowIndex: number;
  data: Record<string, unknown>;
  errors: string[];
  action: 'create' | 'update' | 'error';
  existingRecord?: Record<string, unknown>;
}

export interface DuplicateResolution {
  rowIndex: number;
  action: 'overwrite' | 'create-new';
}

export interface DataTransferValidationResponse {
  canImport: boolean;
  resource: string;
  rows: RowValidationResult[];
  summary: { create: number; update: number; error: number };
  totalErrors: number;
}
