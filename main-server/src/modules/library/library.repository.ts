import { getPool } from '../../infrastructure/database/pg-pool';
import type { LibraryEntityConfig, LibraryListQuery, LibraryRecord } from './library.types';

const columnMap: Record<string, Record<string, string>> = {
  materials: {
    defaultUnit: 'default_unit',
    materialCode: 'material_code',
    materialName: 'material_name',
    materialType: 'material_type',
    notes: 'notes',
    status: 'status',
  },
  suppliers: {
    contactInfo: 'contact_info',
    status: 'status',
    supplierName: 'supplier_name',
    supplierType: 'supplier_type',
  },
  supplier_materials: {
    materialId: 'material_id',
    status: 'status',
    supplierId: 'supplier_id',
    supplierMaterialCode: 'supplier_material_code',
  },
  material_lots: {
    expirationDate: 'expiration_date',
    lotNumber: 'lot_number',
    notes: 'notes',
    receivedDate: 'received_date',
    status: 'status',
    supplierMaterialId: 'supplier_material_id',
  },
  machines: {
    location: 'location',
    machineCode: 'machine_code',
    machineName: 'machine_name',
    status: 'status',
  },
  molds: {
    cavityCount: 'cavity_count',
    moldCode: 'mold_code',
    moldName: 'mold_name',
    moldType: 'mold_type',
    status: 'status',
  },
};

function dbColumn(config: LibraryEntityConfig, key: string): string {
  const mapped = columnMap[config.tableName]?.[key];
  if (!mapped) {
    throw new Error(`Unsupported Library column ${config.tableName}.${key}`);
  }
  return mapped;
}

function normalizePayload(config: LibraryEntityConfig, payload: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const key of config.mutableColumns) {
    if (payload[key] !== undefined) {
      normalized[key] = payload[key] === '' ? null : payload[key];
    }
  }

  if (config.tableName === 'materials') {
    normalized['name'] = normalized['materialName'] ?? payload['materialName'];
    normalized['unit'] = normalized['defaultUnit'] ?? payload['defaultUnit'] ?? 'wt%';
  }

  if (config.tableName === 'suppliers') {
    normalized['name'] = normalized['supplierName'] ?? payload['supplierName'];
  }

  return normalized;
}

function insertColumns(config: LibraryEntityConfig, payload: Record<string, unknown>): Array<{ column: string; value: unknown }> {
  const normalized = normalizePayload(config, payload);
  const entries: Array<{ column: string; value: unknown }> = [];

  for (const key of config.mutableColumns) {
    if (normalized[key] !== undefined) {
      entries.push({ column: dbColumn(config, key), value: normalized[key] });
    }
  }

  if (config.tableName === 'materials') {
    entries.push({ column: 'name', value: normalized['name'] });
    entries.push({ column: 'unit', value: normalized['unit'] });
  }

  if (config.tableName === 'suppliers') {
    entries.push({ column: 'name', value: normalized['name'] });
  }

  return entries.filter((entry, index, all) => all.findIndex((candidate) => candidate.column === entry.column) === index);
}

function updateColumns(config: LibraryEntityConfig, payload: Record<string, unknown>): Array<{ column: string; value: unknown }> {
  const normalized = normalizePayload(config, payload);
  const entries = config.mutableColumns
    .filter((key) => normalized[key] !== undefined)
    .map((key) => ({ column: dbColumn(config, key), value: normalized[key] }));

  if (config.tableName === 'materials') {
    if (normalized['materialName'] !== undefined) entries.push({ column: 'name', value: normalized['materialName'] });
    if (normalized['defaultUnit'] !== undefined) entries.push({ column: 'unit', value: normalized['defaultUnit'] });
  }

  if (config.tableName === 'suppliers' && normalized['supplierName'] !== undefined) {
    entries.push({ column: 'name', value: normalized['supplierName'] });
  }

  return entries.filter((entry, index, all) => all.findIndex((candidate) => candidate.column === entry.column) === index);
}

export class LibraryRepository {
  async list(config: LibraryEntityConfig, query: LibraryListQuery): Promise<LibraryRecord[]> {
    const params: unknown[] = [];
    const clauses: string[] = [];

    if (query.search && config.searchColumns.length > 0) {
      params.push(`%${query.search.toLowerCase()}%`);
      clauses.push(`(${config.searchColumns.map((column) => `LOWER(COALESCE(${column}::text, '')) LIKE $${params.length}`).join(' OR ')})`);
    }

    if (query.status && query.status !== 'all' && config.statusColumn) {
      params.push(query.status);
      clauses.push(`${config.statusColumn}::text = $${params.length}`);
    }

    if (query.category && config.filterColumn) {
      params.push(query.category);
      clauses.push(`${config.filterColumn}::text = $${params.length}`);
    }

    const sql = [
      config.listSql,
      clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      `ORDER BY ${config.defaultOrderBy}`,
    ].join('\n');

    const result = await getPool().query(sql, params);
    return result.rows as LibraryRecord[];
  }

  async findById(config: LibraryEntityConfig, id: string): Promise<LibraryRecord | null> {
    const result = await getPool().query(`SELECT * FROM (${config.listSql}) library_rows WHERE id = $1`, [id]);
    return (result.rows[0] as LibraryRecord | undefined) ?? null;
  }

  async rawById(config: LibraryEntityConfig, id: string): Promise<Record<string, unknown> | null> {
    const result = await getPool().query(`SELECT * FROM ${config.tableName} WHERE id = $1`, [id]);
    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async existsByColumns(
    config: LibraryEntityConfig,
    columns: string[],
    payload: Record<string, unknown>,
    excludeId?: string
  ): Promise<boolean> {
    const params: unknown[] = [];
    const clauses = columns.map((key) => {
      params.push(payload[key] ?? null);
      return `${dbColumn(config, key)} IS NOT DISTINCT FROM $${params.length}`;
    });

    if (excludeId) {
      params.push(excludeId);
      clauses.push(`id <> $${params.length}`);
    }

    const result = await getPool().query(
      `SELECT 1 FROM ${config.tableName} WHERE ${clauses.join(' AND ')} LIMIT 1`,
      params
    );
    return (result.rowCount ?? 0) > 0;
  }

  async create(config: LibraryEntityConfig, payload: Record<string, unknown>): Promise<LibraryRecord> {
    const entries = insertColumns(config, payload);
    const columns = entries.map((entry) => entry.column);
    const params = entries.map((entry) => entry.value);
    const placeholders = params.map((_, index) => `$${index + 1}`);

    const inserted = await getPool().query<{ id: string }>(
      `INSERT INTO ${config.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
      params
    );

    return (await this.findById(config, inserted.rows[0]?.id ?? '')) as LibraryRecord;
  }

  async update(config: LibraryEntityConfig, id: string, payload: Record<string, unknown>): Promise<LibraryRecord | null> {
    const entries = updateColumns(config, payload);
    if (entries.length === 0) {
      return this.findById(config, id);
    }

    const params = entries.map((entry) => entry.value);
    params.push(id);

    await getPool().query(
      `UPDATE ${config.tableName}
       SET ${entries.map((entry, index) => `${entry.column} = $${index + 1}`).join(', ')}, updated_at = now()
       WHERE id = $${params.length}`,
      params
    );

    return this.findById(config, id);
  }

  async archive(config: LibraryEntityConfig, id: string): Promise<LibraryRecord | null> {
    await getPool().query(`UPDATE ${config.tableName} SET status = 'archived', updated_at = now() WHERE id = $1`, [id]);
    return this.findById(config, id);
  }

  async options(resource: string): Promise<LibraryRecord[]> {
    const configMap: Record<string, string> = {
      materials: `SELECT id, material_name AS label, material_code AS code FROM materials WHERE status = 'active' ORDER BY material_code`,
      suppliers: `SELECT id, supplier_name AS label FROM suppliers WHERE status = 'active' ORDER BY supplier_name`,
      'material-lots': `
        SELECT ml.id, CONCAT(ml.lot_number, ' / ', m.material_code) AS label, ml.lot_number AS code,
               sm.material_id AS "materialId", sm.supplier_id AS "supplierId", ml.status::text AS status
        FROM material_lots ml
        JOIN supplier_materials sm ON sm.id = ml.supplier_material_id
        JOIN materials m ON m.id = sm.material_id
        WHERE ml.status = 'active'
        ORDER BY ml.lot_number
      `,
      benchmarks: `SELECT id, benchmark_name AS label, benchmark_code AS code FROM benchmark_profiles WHERE status = 'active' ORDER BY benchmark_name`,
      machines: `SELECT id, machine_name AS label, machine_code AS code FROM machines WHERE status = 'active' ORDER BY machine_code`,
      metrics: `SELECT id, display_name AS label, metric_key AS code FROM metric_definitions WHERE status = 'active' ORDER BY sort_order, metric_key`,
      molds: `SELECT id, mold_name AS label, mold_code AS code, cavity_count AS "cavityCount" FROM molds WHERE status = 'active' ORDER BY mold_code`,
      'supplier-materials': `
        SELECT sm.id, CONCAT(s.supplier_name, ' / ', m.material_code) AS label, sm.supplier_material_code AS code
        FROM supplier_materials sm
        JOIN suppliers s ON s.id = sm.supplier_id
        JOIN materials m ON m.id = sm.material_id
        WHERE sm.status = 'active'
        ORDER BY s.supplier_name, m.material_code
      `,
    };

    const sql = configMap[resource];
    if (!sql) return [];
    const result = await getPool().query(sql);
    return result.rows as LibraryRecord[];
  }
}
