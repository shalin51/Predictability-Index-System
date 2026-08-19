import type { LibraryEntityConfig } from './library.types';

export const libraryConfigs = {
  'material-properties': {
    columns: ['id', 'materialId', 'productGrade', 'propertyId', 'propertyName', 'sourceLabel', 'valueNumeric', 'valueText', 'qualifier', 'unit', 'testMethod', 'testCondition', 'temperatureC', 'load', 'sourceFile', 'sourceRevisionDate', 'notes'],
    createFields: [],
    defaultOrderBy: 'material_id, property_id, material_property_id',
    displayName: 'Material Property',
    idColumn: 'id',
    listSql: `
      SELECT material_property_id AS id, material_id AS "materialId", product_grade AS "productGrade",
             property_id AS "propertyId", property_name AS "propertyName", source_label AS "sourceLabel",
             value_numeric::float AS "valueNumeric", value_text AS "valueText", qualifier, unit,
             test_method AS "testMethod", test_condition AS "testCondition", temperature_c::float AS "temperatureC",
             load, source_file AS "sourceFile", source_revision_date AS "sourceRevisionDate", notes
      FROM material_properties
    `,
    mutableColumns: [],
    readOnly: true,
    requiredFields: [],
    routeKey: 'material-properties',
    searchColumns: ['material_id', 'product_grade', 'property_id', 'property_name', 'source_label', 'unit', 'test_method'],
    tableName: 'material_property_facts',
    uniqueChecks: [],
  },
  'material-suppliers': {
    columns: ['id', 'supplierCode', 'supplierName', 'supplierRole', 'contactName', 'contactEmail', 'contactPhone', 'address', 'website', 'contactInfo', 'supplierNotes', 'status', 'updatedAt', 'createdAt'],
    createFields: [
      { key: 'supplierCode', label: 'Supplier ID', required: true },
      { key: 'supplierName', label: 'Supplier Name', required: true },
      { key: 'supplierRole', label: 'Role' },
      { key: 'contactName', label: 'Contact Name' },
      { key: 'contactEmail', label: 'Contact Email' },
      { key: 'contactPhone', label: 'Contact Phone' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'website', label: 'Website' },
      { key: 'contactInfo', label: 'Contact Info', type: 'textarea' },
      { key: 'supplierNotes', label: 'Notes', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select' },
    ],
    defaultOrderBy: 'supplier_code',
    displayName: 'Material Supplier',
    idColumn: 'id',
    listSql: `
      SELECT id, supplier_code AS "supplierCode", supplier_name AS "supplierName",
             supplier_role AS "supplierRole", contact_name AS "contactName", contact_email AS "contactEmail",
             contact_phone AS "contactPhone", address, website, contact_info AS "contactInfo",
             supplier_notes AS "supplierNotes", status::text AS status,
             updated_at AS "updatedAt", created_at AS "createdAt"
      FROM suppliers
    `,
    mutableColumns: ['supplierCode', 'supplierName', 'supplierRole', 'contactName', 'contactEmail', 'contactPhone', 'address', 'website', 'contactInfo', 'supplierNotes', 'status'],
    requiredFields: ['supplierCode', 'supplierName'],
    routeKey: 'material-suppliers',
    searchColumns: ['supplier_code', 'supplier_name', 'supplier_role', 'contact_name', 'contact_email', 'contact_phone', 'contact_info'],
    statusColumn: 'status',
    tableName: 'suppliers',
    uniqueChecks: [
      { columns: ['supplierCode'], message: 'supplier ID must be unique' },
      { columns: ['supplierName'], message: 'supplier name must be unique' },
    ],
  },
  materials: {
    columns: ['id', 'materialCode', 'materialName', 'materialSupplierId', 'materialSupplierCode', 'supplierName', 'materialLot', 'productGrade', 'chemistry', 'roleInBlend', 'sourceFile', 'sourceRevisionDate', 'status', 'notes', 'updatedAt', 'createdAt'],
    createFields: [
      { key: 'materialCode', label: 'Material ID', required: true },
      { key: 'materialName', label: 'Material Name', required: true },
      { key: 'materialSupplierId', label: 'Material Supplier', type: 'select' },
      { key: 'materialLot', label: 'Material Lot' },
      { key: 'productGrade', label: 'Product Grade', required: true },
      { key: 'chemistry', label: 'Chemistry' },
      { key: 'roleInBlend', label: 'Role in Blend' },
      { key: 'sourceFile', label: 'Source File' },
      { key: 'sourceRevisionDate', label: 'Source Revision Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    defaultOrderBy: 'm.material_code',
    displayName: 'Material',
    filterColumn: 'm.supplier_id',
    idColumn: 'id',
    listSql: `
      SELECT m.id, m.material_code AS "materialCode", m.material_name AS "materialName",
             m.supplier_id AS "materialSupplierId", s.supplier_code AS "materialSupplierCode",
             s.supplier_name AS "supplierName", m.material_lot AS "materialLot", m.product_grade AS "productGrade",
             m.chemistry, m.role_in_blend AS "roleInBlend", m.source_file AS "sourceFile",
             m.source_revision_date AS "sourceRevisionDate", m.status::text AS status, m.notes,
             m.updated_at AS "updatedAt", m.created_at AS "createdAt"
      FROM materials m
      LEFT JOIN suppliers s ON s.id = m.supplier_id
    `,
    mutableColumns: ['materialCode', 'materialName', 'materialSupplierId', 'materialLot', 'productGrade', 'chemistry', 'roleInBlend', 'sourceFile', 'sourceRevisionDate', 'status', 'notes'],
    requiredFields: ['materialCode', 'materialName', 'productGrade'],
    routeKey: 'materials',
    searchColumns: ['m.material_code', 'm.material_name', 's.supplier_code', 's.supplier_name', 'm.product_grade', 'm.chemistry', 'm.role_in_blend'],
    statusColumn: 'm.status',
    tableName: 'materials',
    uniqueChecks: [{ columns: ['materialCode'], message: 'material_code must be unique' }],
  },
  suppliers: {
    columns: ['id', 'supplierName', 'supplierType', 'contactName', 'contactEmail', 'contactPhone', 'address', 'website', 'contactInfo', 'status', 'updatedAt', 'createdAt'],
    createFields: [
      { key: 'supplierName', label: 'Supplier Name', required: true },
      { key: 'supplierType', label: 'Supplier Type' },
      { key: 'contactName', label: 'Contact Name' },
      { key: 'contactEmail', label: 'Contact Email' },
      { key: 'contactPhone', label: 'Contact Phone' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'website', label: 'Website' },
      { key: 'contactInfo', label: 'Contact Info', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select' },
    ],
    defaultOrderBy: 'supplier_name',
    displayName: 'Supplier',
    filterColumn: 'supplier_type',
    idColumn: 'id',
    listSql: `
      SELECT id, supplier_name AS "supplierName", supplier_type AS "supplierType",
             contact_name AS "contactName", contact_email AS "contactEmail", contact_phone AS "contactPhone",
             address, website, contact_info AS "contactInfo", status::text AS status,
             updated_at AS "updatedAt", created_at AS "createdAt"
      FROM suppliers
    `,
    mutableColumns: ['supplierName', 'supplierType', 'contactName', 'contactEmail', 'contactPhone', 'address', 'website', 'contactInfo', 'status'],
    requiredFields: ['supplierName'],
    routeKey: 'suppliers',
    searchColumns: ['supplier_name', 'supplier_type', 'contact_name', 'contact_email', 'contact_phone', 'contact_info'],
    statusColumn: 'status',
    tableName: 'suppliers',
    uniqueChecks: [{ columns: ['supplierName'], message: 'supplier_name must be unique' }],
  },
  'supplier-materials': {
    columns: ['id', 'supplierId', 'supplierName', 'materialId', 'materialCode', 'materialName', 'supplierMaterialCode', 'status', 'updatedAt', 'createdAt'],
    createFields: [
      { key: 'supplierId', label: 'Supplier', required: true, type: 'select' },
      { key: 'materialId', label: 'Material', required: true, type: 'select' },
      { key: 'supplierMaterialCode', label: 'Supplier Material Code' },
      { key: 'status', label: 'Status', type: 'select' },
    ],
    defaultOrderBy: 'supplier_name',
    displayName: 'Supplier Material',
    idColumn: 'id',
    listSql: `
      SELECT sm.id, sm.supplier_id AS "supplierId", s.supplier_name AS "supplierName",
             sm.material_id AS "materialId", m.material_code AS "materialCode",
             m.material_name AS "materialName", sm.supplier_material_code AS "supplierMaterialCode",
             sm.status::text AS status, sm.updated_at AS "updatedAt", sm.created_at AS "createdAt"
      FROM supplier_materials sm
      JOIN suppliers s ON s.id = sm.supplier_id
      JOIN materials m ON m.id = sm.material_id
    `,
    mutableColumns: ['supplierId', 'materialId', 'supplierMaterialCode', 'status'],
    requiredFields: ['supplierId', 'materialId'],
    routeKey: 'supplier-materials',
    searchColumns: ['s.supplier_name', 'm.material_code', 'm.material_name', 'sm.supplier_material_code'],
    statusColumn: 'sm.status',
    tableName: 'supplier_materials',
    uniqueChecks: [{ columns: ['supplierId', 'materialId', 'supplierMaterialCode'], message: 'supplier material mapping already exists' }],
  },
  'material-lots': {
    columns: ['id', 'supplierMaterialId', 'supplierName', 'materialCode', 'materialName', 'lotNumber', 'receivedDate', 'expirationDate', 'status', 'notes', 'updatedAt', 'createdAt'],
    createFields: [
      { key: 'supplierMaterialId', label: 'Supplier Material', required: true, type: 'select' },
      { key: 'lotNumber', label: 'Lot Number', required: true },
      { key: 'receivedDate', label: 'Received Date', type: 'date' },
      { key: 'expirationDate', label: 'Expiration Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    defaultOrderBy: 'lot_number',
    displayName: 'Material Lot',
    idColumn: 'id',
    listSql: `
      SELECT ml.id, ml.supplier_material_id AS "supplierMaterialId",
             s.supplier_name AS "supplierName", m.material_code AS "materialCode",
             m.material_name AS "materialName", ml.lot_number AS "lotNumber",
             ml.received_date AS "receivedDate", ml.expiration_date AS "expirationDate",
             ml.status::text AS status, ml.notes, ml.updated_at AS "updatedAt", ml.created_at AS "createdAt"
      FROM material_lots ml
      JOIN supplier_materials sm ON sm.id = ml.supplier_material_id
      JOIN suppliers s ON s.id = sm.supplier_id
      JOIN materials m ON m.id = sm.material_id
    `,
    mutableColumns: ['supplierMaterialId', 'lotNumber', 'receivedDate', 'expirationDate', 'status', 'notes'],
    requiredFields: ['supplierMaterialId', 'lotNumber'],
    routeKey: 'material-lots',
    searchColumns: ['ml.lot_number', 's.supplier_name', 'm.material_code', 'm.material_name'],
    statusColumn: 'ml.status',
    tableName: 'material_lots',
    uniqueChecks: [{ columns: ['supplierMaterialId', 'lotNumber'], message: 'supplier material + lot number must be unique' }],
  },
  machines: {
    columns: ['id', 'machineCode', 'machineName', 'manufacturer', 'machineType', 'modelNumber', 'serialNumber', 'location', 'status', 'updatedAt', 'createdAt'],
    createFields: [
      { key: 'machineCode', label: 'Machine Code', required: true },
      { key: 'machineName', label: 'Machine Name', required: true },
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'machineType', label: 'Machine Type' },
      { key: 'modelNumber', label: 'Model Number' },
      { key: 'serialNumber', label: 'Serial Number' },
      { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status', type: 'select' },
    ],
    defaultOrderBy: 'machine_code',
    displayName: 'Machine',
    filterColumn: 'location',
    idColumn: 'id',
    listSql: `
      SELECT id, machine_code AS "machineCode", machine_name AS "machineName", manufacturer,
             machine_type AS "machineType", model_number AS "modelNumber", serial_number AS "serialNumber",
             location, status::text AS status, updated_at AS "updatedAt", created_at AS "createdAt"
      FROM machines
    `,
    mutableColumns: ['machineCode', 'machineName', 'manufacturer', 'machineType', 'modelNumber', 'serialNumber', 'location', 'status'],
    requiredFields: ['machineCode', 'machineName'],
    routeKey: 'machines',
    searchColumns: ['machine_code', 'machine_name', 'manufacturer', 'machine_type', 'model_number', 'serial_number', 'location'],
    statusColumn: 'status',
    tableName: 'machines',
    uniqueChecks: [{ columns: ['machineCode'], message: 'machine_code must be unique' }],
  },
  molds: {
    columns: ['id', 'moldCode', 'moldName', 'moldType', 'manufacturer', 'cavityCount', 'hotRunnerController', 'zoneCount', 'description', 'status', 'updatedAt', 'createdAt'],
    createFields: [
      { key: 'moldCode', label: 'Mold Code', required: true },
      { key: 'moldName', label: 'Mold Name' },
      { key: 'moldType', label: 'Mold Type' },
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'cavityCount', label: 'Cavity Count', type: 'number' },
      { key: 'hotRunnerController', label: 'Hot Runner Controller' },
      { key: 'zoneCount', label: 'Zone Count', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select' },
    ],
    defaultOrderBy: 'mold_code',
    displayName: 'Mold',
    filterColumn: 'mold_type',
    idColumn: 'id',
    listSql: `
      SELECT id, mold_code AS "moldCode", mold_name AS "moldName", mold_type AS "moldType", manufacturer,
             cavity_count AS "cavityCount", hot_runner_controller AS "hotRunnerController", zone_count AS "zoneCount",
             description, status::text AS status,
             updated_at AS "updatedAt", created_at AS "createdAt"
      FROM molds
    `,
    mutableColumns: ['moldCode', 'moldName', 'moldType', 'manufacturer', 'cavityCount', 'hotRunnerController', 'zoneCount', 'description', 'status'],
    requiredFields: ['moldCode'],
    routeKey: 'molds',
    searchColumns: ['mold_code', 'mold_name', 'mold_type', 'manufacturer', 'hot_runner_controller'],
    statusColumn: 'status',
    tableName: 'molds',
    uniqueChecks: [{ columns: ['moldCode'], message: 'mold_code must be unique' }],
  },
  'machine-parameters': {
    columns: ['id', 'machineId', 'machineCode', 'parameterKey', 'displayName', 'sectionKey', 'positionType', 'positionIndex', 'positionLabel', 'minimumValue', 'maximumValue', 'unit', 'notes', 'sortOrder', 'status'],
    createFields: [
      { key: 'machineId', label: 'Machine', required: true, type: 'select' },
      { key: 'parameterKey', label: 'Parameter Key', required: true },
      { key: 'displayName', label: 'Display Name', required: true },
      { key: 'sectionKey', label: 'Section', required: true },
      { key: 'positionType', label: 'Position Type' },
      { key: 'positionIndex', label: 'Position Index', type: 'number' },
      { key: 'positionLabel', label: 'Position Label' },
      { key: 'minimumValue', label: 'Minimum Value', type: 'number' },
      { key: 'maximumValue', label: 'Maximum Value', type: 'number' },
      { key: 'unit', label: 'Unit' },
      { key: 'sortOrder', label: 'Sort Order', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select' },
    ],
    defaultOrderBy: 'machine_code, sort_order, position_index NULLS FIRST', displayName: 'Machine Parameter', idColumn: 'id',
    filterColumn: 'mpc.machine_id',
    listSql: `SELECT mpc.id, mpc.machine_id AS "machineId", m.machine_code AS "machineCode", mpc.parameter_key AS "parameterKey", mpc.display_name AS "displayName", mpc.section_key AS "sectionKey", mpc.position_type AS "positionType", mpc.position_index AS "positionIndex", mpc.position_label AS "positionLabel", mpc.minimum_value::float AS "minimumValue", mpc.maximum_value::float AS "maximumValue", mpc.unit, mpc.notes, mpc.sort_order AS "sortOrder", mpc.status::text AS status FROM machine_parameter_capabilities mpc JOIN machines m ON m.id = mpc.machine_id`,
    mutableColumns: ['machineId', 'parameterKey', 'displayName', 'sectionKey', 'positionType', 'positionIndex', 'positionLabel', 'minimumValue', 'maximumValue', 'unit', 'notes', 'sortOrder', 'status'],
    requiredFields: ['machineId', 'parameterKey', 'displayName', 'sectionKey'], routeKey: 'machine-parameters',
    searchColumns: ['m.machine_code', 'mpc.parameter_key', 'mpc.display_name', 'mpc.section_key'], statusColumn: 'mpc.status', tableName: 'machine_parameter_capabilities',
    uniqueChecks: [{ columns: ['machineId', 'parameterKey', 'positionType', 'positionIndex', 'positionLabel'], message: 'machine parameter position already exists' }],
  },
  'mold-zones': {
    columns: ['id', 'moldId', 'moldCode', 'zoneNumber', 'zoneName', 'zoneType', 'minimumTemperature', 'maximumTemperature', 'temperatureUnit', 'notes', 'status'],
    createFields: [
      { key: 'moldId', label: 'Mold', required: true, type: 'select' },
      { key: 'zoneNumber', label: 'Zone Number', required: true, type: 'number' },
      { key: 'zoneName', label: 'Zone Name' },
      { key: 'zoneType', label: 'Zone Type' },
      { key: 'minimumTemperature', label: 'Minimum Temperature', type: 'number' },
      { key: 'maximumTemperature', label: 'Maximum Temperature', type: 'number' },
      { key: 'temperatureUnit', label: 'Temperature Unit' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select' },
    ],
    defaultOrderBy: 'mold_code, zone_number', displayName: 'Mold Zone', idColumn: 'id',
    filterColumn: 'mz.mold_id',
    listSql: `SELECT mz.id, mz.mold_id AS "moldId", m.mold_code AS "moldCode", mz.zone_number AS "zoneNumber", mz.zone_name AS "zoneName", mz.zone_type AS "zoneType", mz.minimum_temperature::float AS "minimumTemperature", mz.maximum_temperature::float AS "maximumTemperature", mz.temperature_unit AS "temperatureUnit", mz.notes, mz.status::text AS status FROM mold_zones mz JOIN molds m ON m.id = mz.mold_id`,
    mutableColumns: ['moldId', 'zoneNumber', 'zoneName', 'zoneType', 'minimumTemperature', 'maximumTemperature', 'temperatureUnit', 'notes', 'status'],
    requiredFields: ['moldId', 'zoneNumber'], routeKey: 'mold-zones', searchColumns: ['m.mold_code', 'mz.zone_name', 'mz.zone_type'],
    statusColumn: 'mz.status', tableName: 'mold_zones', uniqueChecks: [{ columns: ['moldId', 'zoneNumber'], message: 'mold zone number already exists' }],
  },
} satisfies Record<string, LibraryEntityConfig>;

export type LibraryResourceKey = keyof typeof libraryConfigs;

const extraLibraryConfigs: Record<string, LibraryEntityConfig> = {
  metrics: {
    columns: [], createFields: [
      { key: 'metricKey', label: 'Metric Key', required: true }, { key: 'displayName', label: 'Display Name', required: true },
      { key: 'category', label: 'Category', required: true, type: 'select' }, { key: 'defaultUnit', label: 'Unit' },
      { key: 'dataType', label: 'Data Type', type: 'select' }, { key: 'benchmarkComparable', label: 'Benchmark Comparable', type: 'boolean' },
      { key: 'requiredForScoring', label: 'Required for Scoring', type: 'boolean' }, { key: 'higherIsBetter', label: 'Higher Is Better', type: 'boolean' },
      { key: 'status', label: 'Status', type: 'select' },
    ], defaultOrderBy: 'sort_order, metric_key', displayName: 'Metric', filterColumn: 'category', idColumn: 'id',
    listSql: `SELECT id, metric_key AS "metricKey", display_name AS "displayName", category::text AS category, default_unit AS "defaultUnit", data_type::text AS "dataType", benchmark_comparable AS "benchmarkComparable", required_for_scoring AS "requiredForScoring", higher_is_better AS "higherIsBetter", status::text AS status, updated_at AS "updatedAt", created_at AS "createdAt" FROM metric_definitions`,
    mutableColumns: ['metricKey', 'displayName', 'category', 'defaultUnit', 'dataType', 'benchmarkComparable', 'requiredForScoring', 'higherIsBetter', 'status'],
    requiredFields: ['metricKey', 'displayName', 'category'], routeKey: 'metrics', searchColumns: ['metric_key', 'display_name', 'category::text'],
    statusColumn: 'status', tableName: 'metric_definitions', uniqueChecks: [{ columns: ['metricKey'], message: 'metric_key must be unique' }],
  },
  'test-methods': {
    columns: [], createFields: [
      { key: 'methodCode', label: 'Method Code', required: true }, { key: 'methodName', label: 'Method Name', required: true },
      { key: 'metricId', label: 'Metric', type: 'select' }, { key: 'cureHours', label: 'Cure Hours', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' }, { key: 'status', label: 'Status', type: 'select' },
    ], defaultOrderBy: 'method_code', displayName: 'Test Method', idColumn: 'id',
    listSql: `SELECT tm.id, tm.method_code AS "methodCode", tm.method_name AS "methodName", tm.metric_id AS "metricId", md.metric_key AS "metricKey", tm.cure_hours AS "cureHours", tm.description, tm.status::text AS status, tm.updated_at AS "updatedAt", tm.created_at AS "createdAt" FROM test_method_definitions tm LEFT JOIN metric_definitions md ON md.id = tm.metric_id`,
    mutableColumns: ['methodCode', 'methodName', 'metricId', 'cureHours', 'description', 'status'], requiredFields: ['methodCode', 'methodName'],
    routeKey: 'test-methods', searchColumns: ['tm.method_code', 'tm.method_name', 'md.metric_key'], statusColumn: 'tm.status',
    tableName: 'test_method_definitions', uniqueChecks: [{ columns: ['methodCode'], message: 'method_code must be unique' }],
  },
  'test-conditions': {
    columns: [], createFields: [
      { key: 'conditionCode', label: 'Condition Code', required: true }, { key: 'conditionName', label: 'Condition Name', required: true },
      { key: 'description', label: 'Description', type: 'textarea' }, { key: 'status', label: 'Status', type: 'select' },
    ], defaultOrderBy: 'condition_code', displayName: 'Test Condition', idColumn: 'id',
    listSql: `SELECT id, condition_code AS "conditionCode", condition_name AS "conditionName", description, status::text AS status, updated_at AS "updatedAt", created_at AS "createdAt" FROM test_condition_definitions`,
    mutableColumns: ['conditionCode', 'conditionName', 'description', 'status'], requiredFields: ['conditionCode', 'conditionName'],
    routeKey: 'test-conditions', searchColumns: ['condition_code', 'condition_name', 'description'], statusColumn: 'status',
    tableName: 'test_condition_definitions', uniqueChecks: [{ columns: ['conditionCode'], message: 'condition_code must be unique' }],
  },
  benchmarks: {
    columns: [], createFields: [
      { key: 'benchmarkCode', label: 'Benchmark Code', required: true }, { key: 'benchmarkName', label: 'Benchmark Name', required: true },
      { key: 'profileVersion', label: 'Profile Version', type: 'number' }, { key: 'ballBrand', label: 'Ball Brand', required: true },
      { key: 'ballModel', label: 'Ball Model', required: true }, { key: 'status', label: 'Status', type: 'select' }, { key: 'notes', label: 'Notes', type: 'textarea' },
    ], defaultOrderBy: 'benchmark_code, profile_version', displayName: 'Benchmark', idColumn: 'id',
    listSql: `SELECT id, benchmark_code AS "benchmarkCode", benchmark_name AS "benchmarkName", profile_version AS "profileVersion", ball_brand AS "ballBrand", ball_model AS "ballModel", status::text AS status, notes, updated_at AS "updatedAt", created_at AS "createdAt" FROM benchmark_profiles`,
    mutableColumns: ['benchmarkCode', 'benchmarkName', 'profileVersion', 'ballBrand', 'ballModel', 'status', 'notes'],
    requiredFields: ['benchmarkCode', 'benchmarkName', 'ballBrand', 'ballModel'], routeKey: 'benchmarks',
    searchColumns: ['benchmark_code', 'benchmark_name', 'ball_brand', 'ball_model'], statusColumn: 'status',
    tableName: 'benchmark_profiles', uniqueChecks: [{ columns: ['benchmarkCode', 'profileVersion'], message: 'benchmark code + version must be unique' }],
  },
  'scoring-rules': {
    columns: [], createFields: [
      { key: 'benchmarkProfileId', label: 'Benchmark', required: true, type: 'select' }, { key: 'metricId', label: 'Metric', required: true, type: 'select' },
      { key: 'targetMean', label: 'Target Mean', type: 'number' }, { key: 'minAcceptable', label: 'Min Acceptable', type: 'number' },
      { key: 'maxAcceptable', label: 'Max Acceptable', type: 'number' }, { key: 'targetStdDev', label: 'Target Std Dev', type: 'number' },
      { key: 'comparisonMode', label: 'Comparison Mode', type: 'select' },
      { key: 'weight', label: 'Weight', type: 'number' }, { key: 'criticality', label: 'Criticality', type: 'select' }, { key: 'requiredForPass', label: 'Required for Pass', type: 'boolean' },
    ], defaultOrderBy: 'benchmark_code, metric_key', displayName: 'Scoring Rule', idColumn: 'id',
    filterColumn: 'bmt.benchmark_profile_id',
    listSql: `SELECT bmt.id, bmt.benchmark_profile_id AS "benchmarkProfileId", bp.benchmark_code AS "benchmarkCode", bp.benchmark_name AS "benchmarkName", bmt.metric_category AS "metricCategory", bmt.metric_id AS "metricId", md.metric_key AS "metricKey", md.display_name AS "metricName", bmt.target_mean::float AS "targetMean", bmt.min_acceptable::float AS "minAcceptable", bmt.max_acceptable::float AS "maxAcceptable", bmt.target_std_dev::float AS "targetStdDev", bmt.comparison_mode AS "comparisonMode", bmt.weight::float AS weight, bmt.criticality, bmt.required_for_pass AS "requiredForPass", bmt.updated_at AS "updatedAt", bmt.created_at AS "createdAt" FROM benchmark_metric_targets bmt JOIN benchmark_profiles bp ON bp.id = bmt.benchmark_profile_id JOIN metric_definitions md ON md.id = bmt.metric_id`,
    mutableColumns: ['benchmarkProfileId', 'metricId', 'targetMean', 'minAcceptable', 'maxAcceptable', 'targetStdDev', 'comparisonMode', 'weight', 'criticality', 'requiredForPass'],
    requiredFields: ['benchmarkProfileId', 'metricId'], routeKey: 'scoring-rules', searchColumns: ['bp.benchmark_code', 'bp.benchmark_name', 'md.metric_key', 'md.display_name'],
    tableName: 'benchmark_metric_targets', uniqueChecks: [{ columns: ['benchmarkProfileId', 'metricId'], message: 'metric cannot be duplicated per benchmark' }],
  },
};

export function getLibraryConfig(resource: string): LibraryEntityConfig | null {
  if (['suppliers', 'supplier-materials', 'material-lots'].includes(resource)) return null;
  return libraryConfigs[resource as LibraryResourceKey] ?? extraLibraryConfigs[resource] ?? null;
}
