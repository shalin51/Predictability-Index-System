import { getPool } from '../database/pg-pool';
import type {
  Formulation,
  FormulationListItem,
  FormulationDetailDto,
  CreateFormulationDto,
  UpdateFormulationDto,
} from '@amfpi/shared';

// ─── DB row → domain object mappers ─────────────────────────

function rowToFormulation(row: Record<string, unknown>): Formulation {
  return {
    id: row['id'] as string,
    formulationCode: row['formulation_code'] as string,
    name: row['name'] as string,
    description: row['description'] as string | undefined,
    version: row['version'] as number,
    status: row['status'] as Formulation['status'],
    producedDate: row['produced_date']
      ? new Date(row['produced_date'] as string).toISOString().split('T')[0]
      : undefined,
    lotNumber: row['lot_number'] as string | undefined,
    batchSizeKg: row['batch_size_kg'] != null ? Number(row['batch_size_kg']) : undefined,
    notes: row['notes'] as string | undefined,
    createdBy: row['created_by'] as string,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

function rowToListItem(row: Record<string, unknown>): FormulationListItem {
  return {
    id: row['id'] as string,
    formulationCode: row['formulation_code'] as string,
    name: row['name'] as string,
    status: row['status'] as Formulation['status'],
    producedDate: row['produced_date']
      ? new Date(row['produced_date'] as string).toISOString().split('T')[0]
      : undefined,
    lotNumber: row['lot_number'] as string | undefined,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

// ─── Repository ──────────────────────────────────────────────

export class FormulationRepository {
  async findAll(limit = 50, offset = 0): Promise<{ data: FormulationListItem[]; total: number }> {
    const pool = getPool();
    const [dataResult, countResult] = await Promise.all([
      pool.query(
        'SELECT id, formulation_code, name, status, produced_date, lot_number, created_at, updated_at FROM formulations ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) AS total FROM formulations'),
    ]);
    return {
      data: (dataResult.rows as Record<string, unknown>[]).map(rowToListItem),
      total: parseInt(countResult.rows[0]['total'] as string, 10),
    };
  }

  async findById(id: string): Promise<FormulationDetailDto | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM formulations WHERE id = $1',
      [id]
    );
    if (result.rowCount === 0) return null;

    const formulation = rowToFormulation(result.rows[0] as Record<string, unknown>);

    // Load composition
    const matResult = await pool.query(
      `SELECT fm.material_id, m.name AS material_name, fm.percentage, fm.lot_number
       FROM formulation_materials fm
       JOIN materials m ON m.id = fm.material_id
       WHERE fm.formulation_id = $1`,
      [id]
    );

    return {
      ...formulation,
      materials: (matResult.rows as Record<string, unknown>[]).map((r) => ({
        materialId: r['material_id'] as string,
        materialName: r['material_name'] as string,
        percentage: Number(r['percentage']),
        lotNumber: r['lot_number'] as string | undefined,
      })),
    };
  }

  async findByCode(code: string): Promise<Formulation | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM formulations WHERE formulation_code = $1',
      [code]
    );
    if (result.rowCount === 0) return null;
    return rowToFormulation(result.rows[0] as Record<string, unknown>);
  }

  async create(dto: CreateFormulationDto): Promise<Formulation> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO formulations (formulation_code, name, description, status, produced_date, lot_number, batch_size_kg, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        dto.formulationCode,
        dto.name,
        dto.description ?? null,
        dto.status ?? 'draft',
        dto.producedDate ?? null,
        dto.lotNumber ?? null,
        dto.batchSizeKg ?? null,
        dto.notes ?? null,
        dto.createdBy ?? 'system',
      ]
    );
    return rowToFormulation(result.rows[0] as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateFormulationDto): Promise<Formulation | null> {
    const pool = getPool();

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.name !== undefined)        { fields.push(`name = $${idx++}`);          values.push(dto.name); }
    if (dto.description !== undefined) { fields.push(`description = $${idx++}`);   values.push(dto.description); }
    if (dto.status !== undefined)      { fields.push(`status = $${idx++}`);        values.push(dto.status); }
    if (dto.producedDate !== undefined){ fields.push(`produced_date = $${idx++}`); values.push(dto.producedDate); }
    if (dto.lotNumber !== undefined)   { fields.push(`lot_number = $${idx++}`);    values.push(dto.lotNumber); }
    if (dto.batchSizeKg !== undefined) { fields.push(`batch_size_kg = $${idx++}`); values.push(dto.batchSizeKg); }
    if (dto.notes !== undefined)       { fields.push(`notes = $${idx++}`);         values.push(dto.notes); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await pool.query(
      `UPDATE formulations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rowCount === 0) return null;
    return rowToFormulation(result.rows[0] as Record<string, unknown>);
  }
}
