import type { TransferColumn, TransferDefinition } from './dataTransfer.types';

const text = (key: string, header: string, required = false): TransferColumn => ({ header, key, required, type: 'text' });
const number = (key: string, header: string, required = false): TransferColumn => ({ header, key, required, type: 'number' });
const boolean = (key: string, header: string): TransferColumn => ({ header, key, type: 'boolean' });
const date = (key: string, header: string, required = false): TransferColumn => ({ header, key, required, type: 'date' });

export const transferDefinitions: Record<string, TransferDefinition> = {
  materials: {
    filename: 'materials', resource: 'materials', sheets: [{ name: 'Materials', columns: [
      text('materialCode', 'Material Code', true), text('materialName', 'Material Name', true), text('materialSupplierCode', 'Supplier Code'),
      text('materialLot', 'Material Lot'), text('productGrade', 'Product Grade', true), text('chemistry', 'Chemistry'),
      text('roleInBlend', 'Role In Blend'), text('sourceFile', 'Source File'), date('sourceRevisionDate', 'Source Revision Date'),
      text('status', 'Status'), text('notes', 'Notes'),
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
      text('address', 'Address'), text('website', 'Website'), text('contactInfo', 'Contact Info'), text('supplierNotes', 'Notes'), text('status', 'Status'),
    ] }],
  },
  machines: {
    filename: 'machines', resource: 'machines', sheets: [{ name: 'Machines', columns: [
      text('machineCode', 'Machine Code', true), text('machineName', 'Machine Name', true), text('manufacturer', 'Manufacturer'),
      text('machineType', 'Machine Type'), text('modelNumber', 'Model Number'), text('serialNumber', 'Serial Number'),
      text('location', 'Location'), text('status', 'Status'),
    ] }],
  },
  'machine-parameters': {
    filename: 'machine-parameters', resource: 'machine-parameters', sheets: [{ name: 'Machine Parameters', columns: [
      text('machineCode', 'Machine Code', true), text('parameterKey', 'Parameter Key', true), text('displayName', 'Display Name', true),
      text('sectionKey', 'Section', true), text('positionType', 'Position Type'), number('positionIndex', 'Position Index'),
      text('positionLabel', 'Position Label'), number('minimumValue', 'Minimum Value'), number('maximumValue', 'Maximum Value'),
      text('unit', 'Unit'), number('sortOrder', 'Sort Order'), text('notes', 'Notes'), text('status', 'Status'),
    ] }],
  },
  molds: {
    filename: 'molds', resource: 'molds', sheets: [{ name: 'Molds', columns: [
      text('moldCode', 'Mold Code', true), text('moldName', 'Mold Name'), text('moldType', 'Mold Type'), text('manufacturer', 'Manufacturer'),
      number('cavityCount', 'Cavity Count'), text('hotRunnerController', 'Hot Runner Controller'), number('zoneCount', 'Zone Count'),
      text('description', 'Description'), text('status', 'Status'),
    ] }],
  },
  'mold-zones': {
    filename: 'mold-zones', resource: 'mold-zones', sheets: [{ name: 'Mold Zones', columns: [
      text('moldCode', 'Mold Code', true), number('zoneNumber', 'Zone Number', true), text('zoneName', 'Zone Name'), text('zoneType', 'Zone Type'),
      number('minimumTemperature', 'Minimum Temperature'), number('maximumTemperature', 'Maximum Temperature'),
      text('temperatureUnit', 'Temperature Unit'), text('notes', 'Notes'), text('status', 'Status'),
    ] }],
  },
  benchmarks: {
    filename: 'benchmarks', resource: 'benchmarks', sheets: [{ name: 'Benchmarks', columns: [
      text('benchmarkCode', 'Benchmark Code', true), text('benchmarkName', 'Benchmark Name', true), number('profileVersion', 'Profile Version', true),
      text('ballBrand', 'Ball Brand', true), text('ballModel', 'Ball Model', true), text('status', 'Status'), text('notes', 'Notes'),
    ] }],
  },
  'scoring-rules': {
    filename: 'benchmark-properties', resource: 'scoring-rules', sheets: [{ name: 'Benchmark Properties', columns: [
      text('benchmarkCode', 'Benchmark Code', true), number('profileVersion', 'Profile Version', true), text('metricKey', 'Metric Key', true),
      number('targetMean', 'Target Mean'), number('minAcceptable', 'Minimum Acceptable'), number('maxAcceptable', 'Maximum Acceptable'),
      number('targetStdDev', 'Target Std Dev'), text('comparisonMode', 'Comparison Mode'), number('weight', 'Weight'),
      text('criticality', 'Criticality'), boolean('requiredForPass', 'Required For Pass'),
    ] }],
  },
  formulations: {
    filename: 'formulations', resource: 'formulations', sheets: [
      { name: 'Formulations', columns: [
        text('formulationCode', 'Formulation Code', true), number('versionNo', 'Version', true), text('experimentName', 'Experiment'),
        text('family', 'Family'), text('targetBenchmarkCode', 'Target Benchmark Code'), text('status', 'Status'), text('notes', 'Notes'),
      ] },
      { name: 'Components', columns: [
        text('formulationCode', 'Formulation Code', true), number('versionNo', 'Version', true), text('materialCode', 'Material Code', true),
        text('supplierCode', 'Supplier Code', true), text('lotNumber', 'Lot Number'), number('percentComposition', 'Percent Composition', true),
        text('basis', 'Basis'), number('sortOrder', 'Sort Order'),
      ] },
    ],
  },
  'production-runs': {
    filename: 'production-runs', resource: 'production-runs', sheets: [
      { name: 'Production Runs', columns: [
        text('runCode', 'Run Code', true), text('formulationCode', 'Formulation Code', true), number('formulationVersion', 'Formulation Version', true),
        date('dateProduced', 'Date Produced', true), text('machineCode', 'Machine Code', true), text('moldCode', 'Mold Code', true),
        number('injectionPressure', 'Injection Pressure'), text('injectionPressureUnit', 'Injection Pressure Unit'),
        number('meltTemperature', 'Melt Temperature'), text('meltTemperatureUnit', 'Melt Temperature Unit'), number('coolingTime', 'Cooling Time'),
        text('coolingTimeUnit', 'Cooling Time Unit'), number('cycleTime', 'Cycle Time'), text('cycleTimeUnit', 'Cycle Time Unit'),
        number('cureHoursBeforeTest', 'Cure Hours Before Test'), text('jobName', 'Job Name'), text('partNumber', 'Part Number'),
        text('operatorName', 'Operator Name'), text('shiftCode', 'Shift Code'), text('status', 'Status'),
      ] },
      { name: 'Samples', columns: [
        text('runCode', 'Run Code', true), text('sampleCode', 'Sample Code', true), number('cavityNumber', 'Cavity Number'), text('status', 'Status'),
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
