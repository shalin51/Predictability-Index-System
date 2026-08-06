import * as XLSX from 'xlsx';
import { ValidationError } from '../../errors/app-error';
import type {
  MaterialImportValidation,
  ParsedMaterialRecord,
  ParsedMaterialWorkbook,
  ParsedPropertyDefinition,
  ParsedPropertyFact,
} from './materialImport.types';

const REQUIRED_SHEETS = ['Material Register', 'Property Dictionary', 'Property Facts'] as const;
const SINGLE_SHEET_NAME = 'Materials Import';
const SINGLE_SHEET_TITLE = 'Material Import - Single Sheet v1';
const ALLOWED_SHEETS = new Set([
  'Read Me',
  ...REQUIRED_SHEETS,
  'Coverage Map',
  'Property Matrix',
  'Blend Trials',
  'Corrections Log',
]);
const TITLES: Record<(typeof REQUIRED_SHEETS)[number], string> = {
  'Material Register': 'Material Register',
  'Property Dictionary': 'Property Dictionary - 85 canonical properties',
  'Property Facts': 'Property Facts - the dataset',
};

type Sheet = XLSX.WorkSheet;
type Row = Record<string, unknown>;

export class MaterialWorkbookParser {
  parse(bytes: Buffer): { snapshot: ParsedMaterialWorkbook; validation: MaterialImportValidation } {
    if (!Buffer.isBuffer(bytes) || bytes.subarray(0, 2).toString('hex') !== '504b') {
      throw new ValidationError('The uploaded file is not a readable XLSX workbook');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true, cellFormula: true, bookVBA: true });
    } catch {
      throw new ValidationError('The uploaded file is not a readable XLSX workbook');
    }

    if ((workbook as XLSX.WorkBook & { vbaraw?: unknown }).vbaraw) {
      throw new ValidationError('Macro-enabled workbooks are not supported');
    }
    if (workbook.Sheets[SINGLE_SHEET_NAME]) {
      if (workbook.SheetNames.length !== 1) throw new ValidationError(`Single-sheet workbooks may only contain the ${SINGLE_SHEET_NAME} sheet`);
      if (this.text(this.sheet(workbook, SINGLE_SHEET_NAME), 'A1') !== SINGLE_SHEET_TITLE) {
        throw new ValidationError('Workbook fingerprint does not match the single-sheet Material Import v1 template');
      }
      if (this.hasExternalLinks(workbook)) throw new ValidationError('External workbook links are not supported');
      const parsed = this.singleSheet(this.sheet(workbook, SINGLE_SHEET_NAME));
      const validation = this.validate(parsed.snapshot);
      return { snapshot: parsed.snapshot, validation: { errors: [...new Set([...parsed.errors, ...validation.errors])], warnings: validation.warnings } };
    }
    const missing = REQUIRED_SHEETS.filter((name) => !workbook.Sheets[name]);
    if (missing.length > 0) throw new ValidationError(`Missing required sheets: ${missing.join(', ')}`);
    const unsupported = workbook.SheetNames.filter((name) => !ALLOWED_SHEETS.has(name));
    if (unsupported.length > 0) throw new ValidationError(`Unsupported sheets: ${unsupported.join(', ')}`);
    if (this.hasExternalLinks(workbook)) throw new ValidationError('External workbook links are not supported');

    for (const name of REQUIRED_SHEETS) {
      if (this.text(this.sheet(workbook, name), 'A1') !== TITLES[name]) {
        throw new ValidationError('Workbook fingerprint does not match the Material Master v1 template');
      }
    }

    const materials = this.materials(this.sheet(workbook, 'Material Register'));
    const propertyDefinitions = this.propertyDefinitions(this.sheet(workbook, 'Property Dictionary'));
    const propertyFacts = this.propertyFacts(this.sheet(workbook, 'Property Facts'));
    const snapshot: ParsedMaterialWorkbook = {
      templateKey: 'material-master',
      templateVersion: 'v1',
      materials,
      propertyDefinitions,
      propertyFacts,
    };
    return { snapshot, validation: this.validate(snapshot) };
  }

  validateSnapshot(snapshot: ParsedMaterialWorkbook): MaterialImportValidation {
    return this.validate(snapshot);
  }

  private singleSheet(sheet: Sheet): { snapshot: ParsedMaterialWorkbook; errors: string[] } {
    const rows = this.rows(sheet);
    if (rows.length === 0) throw new ValidationError('Materials Import must contain at least one data row');
    const materials = new Map<string, ParsedMaterialRecord>();
    const definitions = new Map<string, ParsedPropertyDefinition>();
    const propertyFacts: ParsedPropertyFact[] = [];
    const errors: string[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 5;
      const material = this.materialFromSingleRow(row, rowNumber);
      const definition = this.definitionFromSingleRow(row, rowNumber);
      const existingMaterial = materials.get(material.externalId.toLowerCase());
      const existingDefinition = definitions.get(definition.propertyKey.toLowerCase());
      if (existingMaterial && JSON.stringify(existingMaterial) !== JSON.stringify(material)) errors.push(`Inconsistent material details for ${material.externalId}`);
      if (existingDefinition && JSON.stringify(existingDefinition) !== JSON.stringify(definition)) errors.push(`Inconsistent property definition for ${definition.propertyKey}`);
      materials.set(material.externalId.toLowerCase(), existingMaterial ?? material);
      definitions.set(definition.propertyKey.toLowerCase(), existingDefinition ?? definition);
      propertyFacts.push(this.factFromSingleRow(row, rowNumber));
    });

    return {
      snapshot: {
        templateKey: 'material-master',
        templateVersion: 'v1',
        materials: [...materials.values()],
        propertyDefinitions: [...definitions.values()],
        propertyFacts,
      },
      errors,
    };
  }

  private materialFromSingleRow(row: Row, rowNumber: number): ParsedMaterialRecord {
    return {
      externalId: this.required(row['material_id'], `Materials Import row ${rowNumber} material_id`),
      manufacturer: this.required(row['manufacturer'], `Materials Import row ${rowNumber} manufacturer`),
      productGrade: this.required(row['product_grade'], `Materials Import row ${rowNumber} product_grade`),
      chemistry: this.required(row['chemistry'], `Materials Import row ${rowNumber} chemistry`),
      roleInBlend: this.optional(row['role_in_blend']),
      sourceFile: this.required(row['source_file'], `Materials Import row ${rowNumber} source_file`),
      sourceRevisionDate: this.date(row['source_revision_date']),
      notes: this.optional(row['material_notes']),
    };
  }

  private definitionFromSingleRow(row: Row, rowNumber: number): ParsedPropertyDefinition {
    return {
      propertyKey: this.required(row['property_id'], `Materials Import row ${rowNumber} property_id`),
      category: this.required(row['category'], `Materials Import row ${rowNumber} category`),
      canonicalName: this.required(row['property_name'], `Materials Import row ${rowNumber} property_name`),
      sourceLabelsSynonyms: this.optional(row['source_labels_synonyms']),
      conditionDimensions: this.optional(row['condition_dimensions']),
      commonUnits: this.optional(row['common_units']),
      valueType: this.required(row['value_type'], `Materials Import row ${rowNumber} value_type`),
      origin: this.optional(row['origin']),
      implementationNotes: this.optional(row['implementation_notes']),
    };
  }

  private factFromSingleRow(row: Row, rowNumber: number): ParsedPropertyFact {
    const valueNumeric = this.number(row['value_numeric'], `Materials Import row ${rowNumber} value_numeric`);
    const valueText = this.optional(row['value_text']);
    if (valueNumeric == null && !valueText) throw new ValidationError(`Materials Import row ${rowNumber} requires value_numeric or value_text`);
    return {
      materialExternalId: this.required(row['material_id'], `Materials Import row ${rowNumber} material_id`),
      manufacturer: this.required(row['manufacturer'], `Materials Import row ${rowNumber} manufacturer`),
      productGrade: this.required(row['product_grade'], `Materials Import row ${rowNumber} product_grade`),
      propertyKey: this.required(row['property_id'], `Materials Import row ${rowNumber} property_id`),
      propertyName: this.required(row['property_name'], `Materials Import row ${rowNumber} property_name`),
      sourceLabel: this.required(row['source_label'], `Materials Import row ${rowNumber} source_label`),
      valueNumeric,
      valueText,
      qualifier: this.optional(row['qualifier']),
      unit: this.optional(row['unit']),
      testMethod: this.required(row['test_method'], `Materials Import row ${rowNumber} test_method`),
      testCondition: this.optional(row['test_condition']),
      temperatureC: this.number(row['temperature_c'], `Materials Import row ${rowNumber} temperature_c`),
      load: this.optional(row['load']),
      duration: this.optional(row['duration']),
      frequency: this.optional(row['frequency']),
      direction: this.optional(row['direction']),
      specimen: this.optional(row['specimen']),
      processType: this.optional(row['process_type']),
      zone: this.optional(row['zone']),
      sourceFile: this.required(row['source_file'], `Materials Import row ${rowNumber} source_file`),
      sourcePage: this.optional(row['source_page']),
      sourceRevisionDate: this.date(row['source_revision_date']),
      notes: this.optional(row['fact_notes']),
    };
  }

  private materials(sheet: Sheet): ParsedMaterialRecord[] {
    return this.rows(sheet).map((row, index) => ({
      externalId: this.required(row['material_id'], `Material Register row ${index + 5} material_id`),
      manufacturer: this.required(row['manufacturer'], `Material Register row ${index + 5} manufacturer`),
      productGrade: this.required(row['product_grade'], `Material Register row ${index + 5} product_grade`),
      chemistry: this.required(row['chemistry'], `Material Register row ${index + 5} chemistry`),
      roleInBlend: this.optional(row['role_in_blend']),
      sourceFile: this.required(row['source_file'], `Material Register row ${index + 5} source_file`),
      sourceRevisionDate: this.date(row['source_revision_date']),
      notes: this.optional(row['notes']),
    }));
  }

  private propertyDefinitions(sheet: Sheet): ParsedPropertyDefinition[] {
    return this.rows(sheet).map((row, index) => ({
      propertyKey: this.required(row['property_id'], `Property Dictionary row ${index + 5} property_id`),
      category: this.required(row['category'], `Property Dictionary row ${index + 5} category`),
      canonicalName: this.required(row['canonical_property'], `Property Dictionary row ${index + 5} canonical_property`),
      sourceLabelsSynonyms: this.optional(row['source_labels_synonyms']),
      conditionDimensions: this.optional(row['condition_dimensions']),
      commonUnits: this.optional(row['common_units']),
      valueType: this.required(row['value_type'], `Property Dictionary row ${index + 5} value_type`),
      origin: this.optional(row['origin']),
      implementationNotes: this.optional(row['implementation_notes']),
    }));
  }

  private propertyFacts(sheet: Sheet): ParsedPropertyFact[] {
    return this.rows(sheet).map((row, index) => {
      const valueNumeric = this.number(row['value_numeric'], `Property Facts row ${index + 5} value_numeric`);
      const valueText = this.optional(row['value_text']);
      if (valueNumeric == null && !valueText) throw new ValidationError(`Property Facts row ${index + 5} requires value_numeric or value_text`);
      return {
        materialExternalId: this.required(row['material_id'], `Property Facts row ${index + 5} material_id`),
        manufacturer: this.required(row['manufacturer'], `Property Facts row ${index + 5} manufacturer`),
        productGrade: this.required(row['product_grade'], `Property Facts row ${index + 5} product_grade`),
        propertyKey: this.required(row['property_id'], `Property Facts row ${index + 5} property_id`),
        propertyName: this.required(row['property_name'], `Property Facts row ${index + 5} property_name`),
        sourceLabel: this.required(row['source_label'], `Property Facts row ${index + 5} source_label`),
        valueNumeric,
        valueText,
        qualifier: this.optional(row['qualifier']),
        unit: this.optional(row['unit']),
        testMethod: this.required(row['test_method'], `Property Facts row ${index + 5} test_method`),
        testCondition: this.optional(row['test_condition']),
        temperatureC: this.number(row['temperature_c'], `Property Facts row ${index + 5} temperature_c`),
        load: this.optional(row['load']),
        duration: this.optional(row['duration']),
        frequency: this.optional(row['frequency']),
        direction: this.optional(row['direction']),
        specimen: this.optional(row['specimen']),
        processType: this.optional(row['process_type']),
        zone: this.optional(row['zone']),
        sourceFile: this.required(row['source_file'], `Property Facts row ${index + 5} source_file`),
        sourcePage: this.optional(row['source_page']),
        sourceRevisionDate: this.date(row['source_revision_date']),
        notes: this.optional(row['notes']),
      };
    });
  }

  private validate(snapshot: ParsedMaterialWorkbook): MaterialImportValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const materialIds = snapshot.materials.map((item) => item.externalId.toLowerCase());
    const propertyKeys = snapshot.propertyDefinitions.map((item) => item.propertyKey.toLowerCase());
    if (new Set(materialIds).size !== materialIds.length) errors.push('Material Register contains duplicate material_id values');
    if (new Set(propertyKeys).size !== propertyKeys.length) errors.push('Property Dictionary contains duplicate property_id values');
    const grades = snapshot.materials.map((item) => item.productGrade.toLowerCase());
    if (new Set(grades).size !== grades.length) errors.push('Material Register contains duplicate product_grade values');

    const materials = new Map(snapshot.materials.map((item) => [item.externalId.toLowerCase(), item]));
    const definitions = new Map(snapshot.propertyDefinitions.map((item) => [item.propertyKey.toLowerCase(), item]));
    const factKeys = new Set<string>();
    for (const fact of snapshot.propertyFacts) {
      const material = materials.get(fact.materialExternalId.toLowerCase());
      const definition = definitions.get(fact.propertyKey.toLowerCase());
      if (!material) errors.push(`Unknown material_id in Property Facts: ${fact.materialExternalId}`);
      if (!definition) errors.push(`Unknown property_id in Property Facts: ${fact.propertyKey}`);
      if (material && material.manufacturer.toLowerCase() !== fact.manufacturer.toLowerCase()) errors.push(`Manufacturer mismatch for ${fact.materialExternalId}`);
      if (material && material.productGrade.toLowerCase() !== fact.productGrade.toLowerCase()) errors.push(`Product grade mismatch for ${fact.materialExternalId}`);
      if (definition && definition.canonicalName.toLowerCase() !== fact.propertyName.toLowerCase()) errors.push(`Property name mismatch for ${fact.propertyKey}`);
      if (fact.qualifier && !['>', '<', '>=', '<=', '='].includes(fact.qualifier)) errors.push(`Unsupported qualifier for ${fact.materialExternalId}/${fact.propertyKey}: ${fact.qualifier}`);
      const key = JSON.stringify(fact);
      if (factKeys.has(key)) errors.push(`Duplicate property fact for ${fact.materialExternalId}/${fact.propertyKey}/${fact.sourceLabel}`);
      factKeys.add(key);
    }
    for (const material of snapshot.materials) {
      if (!material.sourceRevisionDate) warnings.push(`Source revision date is blank for ${material.externalId}`);
    }
    return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
  }

  private rows(sheet: Sheet): Row[] {
    return XLSX.utils.sheet_to_json<Row>(sheet, { range: 3, defval: null, raw: true }).filter((row) => Object.values(row).some((value) => value !== null && value !== ''));
  }

  private sheet(workbook: XLSX.WorkBook, name: string): Sheet {
    const sheet = workbook.Sheets[name];
    if (!sheet) throw new ValidationError(`Missing required sheet: ${name}`);
    return sheet;
  }

  private text(sheet: Sheet, address: string): string {
    return String(sheet[address]?.v ?? '').trim();
  }

  private required(value: unknown, label: string): string {
    const result = this.optional(value);
    if (!result) throw new ValidationError(`${label} is required`);
    return result;
  }

  private optional(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const result = String(value).trim();
    return result || null;
  }

  private number(value: unknown, label: string): number | null {
    if (value === null || value === undefined || value === '') return null;
    const result = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(result)) throw new ValidationError(`${label} must be numeric`);
    return result;
  }

  private date(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const text = String(value).trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) throw new ValidationError(`Invalid source revision date: ${text}`);
    return parsed.toISOString().slice(0, 10);
  }

  private hasExternalLinks(workbook: XLSX.WorkBook): boolean {
    if (workbook.Workbook?.Names?.some((name) => /\[[^\]]+\]/.test(name.Ref ?? ''))) return true;
    return workbook.SheetNames.some((name) => Object.values(workbook.Sheets[name] ?? {}).some((candidate) => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
      const cell = candidate as XLSX.CellObject;
      return Boolean(cell.l?.Target && /\.(xlsx?|xlsm|xlsb)(?:[#?]|$)/i.test(cell.l.Target));
    }));
  }
}
