export interface MaterialImportValidation {
  errors: string[];
  warnings: string[];
}

export interface ParsedMaterialRecord {
  externalId: string;
  manufacturer: string;
  productGrade: string;
  chemistry: string;
  roleInBlend?: string | null;
  sourceFile: string;
  sourceRevisionDate?: string | null;
  notes?: string | null;
}

export interface ParsedPropertyDefinition {
  propertyKey: string;
  category: string;
  canonicalName: string;
  sourceLabelsSynonyms?: string | null;
  conditionDimensions?: string | null;
  commonUnits?: string | null;
  valueType: string;
  origin?: string | null;
  implementationNotes?: string | null;
}

export interface ParsedPropertyFact {
  materialExternalId: string;
  manufacturer: string;
  productGrade: string;
  propertyKey: string;
  propertyName: string;
  sourceLabel: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  qualifier?: string | null;
  unit?: string | null;
  testMethod: string;
  testCondition?: string | null;
  temperatureC?: number | null;
  load?: string | null;
  duration?: string | null;
  frequency?: string | null;
  direction?: string | null;
  specimen?: string | null;
  processType?: string | null;
  zone?: string | null;
  sourceFile: string;
  sourcePage?: string | null;
  sourceRevisionDate?: string | null;
  notes?: string | null;
}

export interface ParsedMaterialWorkbook {
  templateKey: 'material-master';
  templateVersion: 'v1';
  materials: ParsedMaterialRecord[];
  propertyDefinitions: ParsedPropertyDefinition[];
  propertyFacts: ParsedPropertyFact[];
}

export interface MaterialMatchPreview {
  externalId: string;
  productGrade: string;
  manufacturer: string;
  matchedMaterialId?: string | null;
  matchedMaterialCode?: string | null;
  action: 'match' | 'create';
}

export interface MaterialImportCommitInput {
  materialResolutions: Record<string, string>;
}
