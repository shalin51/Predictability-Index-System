import type { TransferColumn, TransferDefinition } from './dataTransfer.types';
import {
  FORMULATION_BASES, FORMULATION_STATUSES,
  POSITION_TYPES, PRODUCTION_RUN_STATUSES, RECORD_STATUSES,
} from '../../constants/domain.constants';

const text = (key: string, header: string, required = false, options: Partial<TransferColumn> = {}): TransferColumn => ({ header, key, required, type: 'text', ...options });
const number = (key: string, header: string, required = false): TransferColumn => ({ header, key, required, type: 'number' });
const date = (key: string, header: string, required = false): TransferColumn => ({ header, key, required, type: 'date' });

export const transferDefinitions: Record<string, TransferDefinition> = {
  materials: {
    filename: 'materials', resource: 'materials', sheets: [{ name: 'Materials', columns: [
      text('materialCode', 'Material Code', true), text('materialName', 'Material Name', true), text('materialSupplierCode', 'Supplier Code'),
      text('materialLot', 'Material Lot'), text('productGrade', 'Product Grade', true), text('chemistry', 'Chemistry'),
      text('roleInBlend', 'Role In Blend'), text('sourceFile', 'Source File'), date('sourceRevisionDate', 'Source Revision Date'),
      text('status', 'Status', false, { allowedValues: RECORD_STATUSES, defaultValue: 'active' }), text('notes', 'Notes'),
    ] }],
  },
  'material-properties': {
    filename: 'material-properties', resource: 'material-properties', sheets: [{ name: 'Properties', columns: [
      text('materialCode', 'Material Code', true), text('propertyId', 'Property ID', true), text('propertyName', 'Property Name', true),
      text('category', 'Category', true), text('sourceLabel', 'Source Label', true), text('valueType', 'Value Type', true),
      number('valueNumeric', 'Numeric Value'), text('valueText', 'Text Value'), text('qualifier', 'Qualifier'), text('unit', 'Unit'),
      text('testMethod', 'Test Method', true), text('testCondition', 'Test Condition'), number('temperatureC', 'Temperature C'),
      text('load', 'Load'), text('sourceFile', 'Source File'), date('sourceRevisionDate', 'Source Revision Date'), text('notes', 'Notes'),
    ] }],
  },
  'material-suppliers': {
    filename: 'material-suppliers', resource: 'material-suppliers', sheets: [{ name: 'Suppliers', columns: [
      text('supplierCode', 'Supplier Code', true), text('supplierName', 'Supplier Name', true), text('supplierRole', 'Supplier Role'),
      text('contactName', 'Contact Name'), text('contactEmail', 'Contact Email'), text('contactPhone', 'Contact Phone'),
      text('address', 'Address'), text('website', 'Website'), text('contactInfo', 'Contact Info'), text('supplierNotes', 'Notes'), text('status', 'Status', false, { allowedValues: RECORD_STATUSES, defaultValue: 'active' }),
    ] }],
  },
  machines: {
    filename: 'machines', resource: 'machines', sheets: [
      { name: 'Machines', columns: [
        text('machineCode', 'Machine Code', true), text('machineName', 'Machine Name', true), text('manufacturer', 'Manufacturer'),
        text('machineType', 'Machine Type'), text('modelNumber', 'Model Number'), text('serialNumber', 'Serial Number'),
        text('location', 'Location'), text('status', 'Status', false, { allowedValues: RECORD_STATUSES, defaultValue: 'active' }),
      ] },
      { name: 'Machine Parameters', columns: [
        text('machineCode', 'Machine Code', true), text('parameterKey', 'Parameter Key', true), text('displayName', 'Display Name', true),
        text('sectionKey', 'Section', true), text('positionType', 'Position Type', false, { allowedValues: POSITION_TYPES, defaultValue: 'single' }), number('positionIndex', 'Position Index'),
        text('positionLabel', 'Position Label'), number('minimumValue', 'Minimum Value'), number('maximumValue', 'Maximum Value'),
        text('unit', 'Unit'), number('sortOrder', 'Sort Order'), text('notes', 'Notes'), text('status', 'Status', false, { allowedValues: RECORD_STATUSES, defaultValue: 'active' }),
      ] },
    ],
  },
  molds: {
    filename: 'molds', resource: 'molds', sheets: [
      { name: 'Molds', columns: [
        text('moldCode', 'Mold Code', true), text('moldName', 'Mold Name'), text('moldType', 'Mold Type'), text('manufacturer', 'Manufacturer'),
        number('cavityCount', 'Cavity Count'), text('hotRunnerController', 'Hot Runner Controller'), number('zoneCount', 'Zone Count'),
        text('description', 'Description'), text('status', 'Status', false, { allowedValues: RECORD_STATUSES, defaultValue: 'active' }),
      ] },
      { name: 'Mold Zones', columns: [
        text('moldCode', 'Mold Code', true), number('zoneNumber', 'Zone Number', true), text('zoneName', 'Zone Name'), text('zoneType', 'Zone Type'),
        number('minimumTemperature', 'Minimum Temperature'), number('maximumTemperature', 'Maximum Temperature'),
        text('temperatureUnit', 'Temperature Unit'), text('notes', 'Notes'), text('status', 'Status', false, { allowedValues: RECORD_STATUSES, defaultValue: 'active' }),
      ] },
    ],
  },
  benchmarks: {
    filename: 'benchmarks', resource: 'benchmarks', sheets: [
      { name: 'Benchmarks', columns: [
        text('benchmarkCode', 'Benchmark Code', true), text('benchmarkName', 'Benchmark Name', true), number('profileVersion', 'Profile Version', true),
        text('ballBrand', 'Ball Brand', true), text('ballModel', 'Ball Model', true),
        date('testDate', 'Test Date'), text('reportNumber', 'Report Number'),
        text('status', 'Status', false, { allowedValues: RECORD_STATUSES, defaultValue: 'active' }), text('notes', 'Notes'),
      ] },
      { name: 'Benchmark Properties', columns: [
        text('benchmarkCode', 'Benchmark Code', true), number('profileVersion', 'Profile Version', true), text('metricKey', 'Metric Key', true),
        number('value', 'Value'),
      ] },
    ],
  },
  formulations: {
    filename: 'formulations', resource: 'formulations', sheets: [
      { name: 'Formulations', columns: [
        text('formulationCode', 'Formulation Code', true), text('formulationName', 'Formulation Name'), number('versionNo', 'Version', true),
        text('status', 'Status', false, { allowedValues: FORMULATION_STATUSES, defaultValue: 'draft' }), text('approvedBy', 'Approved By'), text('notes', 'Notes'),
        text('materialCode', 'Material Code'), text('supplierCode', 'Supplier Code'), text('lotNumber', 'Lot Number'),
        number('percentComposition', 'Percent Composition'), text('basis', 'Basis', false, { allowedValues: FORMULATION_BASES, defaultValue: 'weight_percent' }), number('sortOrder', 'Sort Order'),
      ] },
    ],
  },
  'production-runs': {
    filename: 'production-runs', resource: 'production-runs', sheets: [
      { name: 'Production Runs', columns: [
        text('runCode', 'Run Code', true), text('formulationCode', 'Formulation Code', true), number('formulationVersion', 'Formulation Version', true),
        date('dateProduced', 'Date Produced', true), text('machineCode', 'Machine Code', true), text('moldCode', 'Mold Code', true),
        text('machineSetupProfileCode', 'Machine Setup Profile Code'),
        number('injectionPressure', 'Injection Pressure'), text('injectionPressureUnit', 'Injection Pressure Unit'),
        number('meltTemperature', 'Melt Temperature'), text('meltTemperatureUnit', 'Melt Temperature Unit'),
        number('coolingTime', 'Cooling Time'), text('coolingTimeUnit', 'Cooling Time Unit'),
        number('cycleTime', 'Cycle Time'), text('cycleTimeUnit', 'Cycle Time Unit'),
        number('cureHoursBeforeTest', 'Cure Hours Before Test'), text('jobName', 'Job Name'), text('partNumber', 'Part Number'),
        text('operatorName', 'Operator Name'), text('shiftCode', 'Shift Code'),
        text('status', 'Status', false, { allowedValues: PRODUCTION_RUN_STATUSES, defaultValue: 'planned' }), text('approvedBy', 'Approved By'),
      ] },
    ],
  },
  'machine-setup-profiles': {
    filename: 'machine-setup-profiles', resource: 'machine-setup-profiles', sheets: [
      { name: 'Machine Setup Profiles', columns: [
        text('machineCode', 'Machine Code', true), text('profileCode', 'Profile Code', true), text('profileName', 'Profile Name', true),
        text('parameterKey', 'Parameter Key'), text('displayName', 'Parameter Name'), text('category', 'Category'), text('scope', 'Scope'),
        text('positionLabel', 'Position Label'), text('unit', 'Unit'), text('value', 'Value'),
        text('status', 'Status', false, { allowedValues: RECORD_STATUSES, defaultValue: 'active' }), text('notes', 'Notes'),
      ] },
    ],
  },
  'scoring-profiles': {
    filename: 'scoring-profiles', resource: 'scoring-profiles', sheets: [
      { name: 'Scoring Profiles', columns: [
        text('scoringProfileId', 'Scoring Profile ID', true), text('scoringProfileName', 'Scoring Profile Name', true),
        text('metricKey', 'Metric Key', true), number('weight', 'Weight (%)', true),
        text('status', 'Status', false, { allowedValues: RECORD_STATUSES, defaultValue: 'active' }),
      ] },
    ],
  },
  testing: {
    filename: 'testing', resource: 'testing', sheets: [
      { name: 'Ball Tests', columns: [
        text('productionRunCode', 'Production Run Code', true), text('ballTestType', 'Ball Test Type', true),
        number('sample1', 'Sample 1'), number('sample2', 'Sample 2'), number('sample3', 'Sample 3'),
        number('sample4', 'Sample 4'), number('sample5', 'Sample 5'), number('sample6', 'Sample 6'),
      ] },
    ],
  },
  'lab-results': {
    filename: 'lab-results', resource: 'lab-results', sheets: [
      { name: 'Lab Results', columns: [
        text('sampleCode', 'Sample Code', true), text('metricKey', 'Metric Key', true), text('methodCode', 'Method Code'),
        number('valueNumeric', 'Numeric Value', true), text('unit', 'Unit'), text('testedBy', 'Tested By'), date('testedAt', 'Tested At'), text('auditReason', 'Audit Reason'),
      ] },
      { name: 'Environmental Results', columns: [
        text('sampleCode', 'Sample Code', true), text('metricKey', 'Metric Key', true), text('conditionCode', 'Condition Code'), text('methodCode', 'Method Code'),
        number('valueNumeric', 'Numeric Value', true), text('unit', 'Unit'), text('testedBy', 'Tested By'), date('testedAt', 'Tested At'), text('auditReason', 'Audit Reason'),
      ] },
      { name: 'Subjective Ratings', columns: [
        text('sampleCode', 'Sample Code', true), text('metricKey', 'Metric Key'), number('ratingValue', 'Rating Value'), text('feedbackText', 'Feedback'),
        text('ratedBy', 'Rated By'), date('ratedAt', 'Rated At'), text('auditReason', 'Audit Reason'),
      ] },
      { name: 'Observations', columns: [
        text('sampleCode', 'Sample Code', true), text('observationType', 'Observation Type'), text('observationText', 'Observation', true),
        text('observedBy', 'Observed By'), date('observedAt', 'Observed At'), text('auditReason', 'Audit Reason'),
      ] },
    ],
  },
};

export function getTransferDefinition(resource: string): TransferDefinition | null {
  return transferDefinitions[resource] ?? null;
}
