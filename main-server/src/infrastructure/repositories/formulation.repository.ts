import type { PoolClient } from 'pg';
import { getPool } from '../database/pg-pool';
import type {
  CreateFormulationDto,
  Formulation,
  FormulationDetailDto,
  FormulationListItem,
  ManufacturingData,
  UpdateFormulationDto,
} from '@amfpi/shared';

type FormulationRow = {
  id: string;
  formulation_code: string;
  produced_date?: string | null;
};

function toIsoDate(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString().split('T')[0];
}

function rowToListItem(row: FormulationRow): FormulationListItem {
  return {
    id: row.id,
    formulationCode: row.formulation_code,
    producedDate: toIsoDate(row.produced_date),
  };
}

function rowToBaseFormulation(row: FormulationRow): Omit<Formulation, 'resinComponents' | 'manufacturingData'> {
  return {
    id: row.id,
    formulationCode: row.formulation_code,
    producedDate: toIsoDate(row.produced_date),
  };
}

async function loadResinComponents(client: PoolClient, formulationId: string): Promise<Formulation['resinComponents']> {
  const result = await client.query(
    `SELECT
       fm.material_id,
       m.name AS resin_component,
       fm.percentage AS percent_composition,
       s.name AS material_supplier,
       fm.lot_number
     FROM formulation_materials fm
     JOIN materials m ON m.id = fm.material_id
     LEFT JOIN suppliers s ON s.id = m.supplier_id
     WHERE fm.formulation_id = $1
     ORDER BY fm.percentage DESC, m.name ASC`,
    [formulationId]
  );

  return (result.rows as Array<Record<string, unknown>>).map((row) => ({
    materialId: row['material_id'] as string,
    resinComponent: row['resin_component'] as string,
    percentComposition: Number(row['percent_composition']),
    materialSupplier: (row['material_supplier'] as string | null) ?? '',
    lotNumber: (row['lot_number'] as string | null) ?? undefined,
  }));
}

async function loadManufacturingData(client: PoolClient, formulationId: string): Promise<ManufacturingData | null> {
  const result = await client.query(
    `SELECT
       mold_used,
       injection_pressure,
       melt_temp_c,
       cooling_time_s,
       cycle_time_s,
       machine_id
     FROM processing_runs
     WHERE formulation_id = $1
     ORDER BY run_date DESC, created_at DESC
     LIMIT 1`,
    [formulationId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0] as Record<string, unknown>;
  return {
    moldUsed: (row['mold_used'] as string | null) ?? undefined,
    injectionPressure: row['injection_pressure'] != null ? Number(row['injection_pressure']) : undefined,
    meltTemperature: row['melt_temp_c'] != null ? Number(row['melt_temp_c']) : undefined,
    coolingTime: row['cooling_time_s'] != null ? Number(row['cooling_time_s']) : undefined,
    cycleTime: row['cycle_time_s'] != null ? Number(row['cycle_time_s']) : undefined,
    machineUsed: (row['machine_id'] as string | null) ?? undefined,
  };
}

async function hydrateFormulation(client: PoolClient, row: FormulationRow): Promise<FormulationDetailDto> {
  const formulation = rowToBaseFormulation(row);
  const [resinComponents, manufacturingData] = await Promise.all([
    loadResinComponents(client, row.id),
    loadManufacturingData(client, row.id),
  ]);

  return {
    ...formulation,
    resinComponents,
    manufacturingData,
  };
}

async function ensureSupplier(client: PoolClient, supplierName: string): Promise<string> {
  const result = await client.query(
    `INSERT INTO suppliers (name)
     VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [supplierName]
  );

  return result.rows[0]['id'] as string;
}

async function ensureMaterial(
  client: PoolClient,
  resinComponent: string,
  materialSupplier: string
): Promise<string> {
  const supplierId = await ensureSupplier(client, materialSupplier);
  const result = await client.query(
    `INSERT INTO materials (name, material_type, supplier_id, unit)
     VALUES ($1, 'resin', $2, 'kg')
     ON CONFLICT (name, material_type)
     DO UPDATE SET supplier_id = EXCLUDED.supplier_id
     RETURNING id`,
    [resinComponent, supplierId]
  );

  return result.rows[0]['id'] as string;
}

async function replaceResinComponents(
  client: PoolClient,
  formulationId: string,
  resinComponents: CreateFormulationDto['resinComponents']
): Promise<void> {
  await client.query('DELETE FROM formulation_materials WHERE formulation_id = $1', [formulationId]);

  for (const component of resinComponents) {
    const materialId = await ensureMaterial(client, component.resinComponent, component.materialSupplier);
    await client.query(
      `INSERT INTO formulation_materials (formulation_id, material_id, percentage, lot_number)
       VALUES ($1, $2, $3, $4)`,
      [
        formulationId,
        materialId,
        component.percentComposition,
        component.lotNumber ?? null,
      ]
    );
  }
}

async function upsertManufacturingData(
  client: PoolClient,
  formulationId: string,
  manufacturingData: ManufacturingData | undefined
): Promise<void> {
  if (manufacturingData === undefined) {
    return;
  }

  const existing = await client.query(
    `SELECT id
     FROM processing_runs
     WHERE formulation_id = $1
     ORDER BY run_date DESC, created_at DESC
     LIMIT 1`,
    [formulationId]
  );

  const values = [
    manufacturingData.moldUsed ?? null,
    manufacturingData.injectionPressure ?? null,
    manufacturingData.meltTemperature ?? null,
    manufacturingData.coolingTime ?? null,
    manufacturingData.cycleTime ?? null,
    manufacturingData.machineUsed ?? null,
  ];

  if (existing.rowCount === 0) {
    await client.query(
      `INSERT INTO processing_runs
         (formulation_id, mold_used, injection_pressure, melt_temp_c, cooling_time_s, cycle_time_s, machine_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [formulationId, ...values]
    );
    return;
  }

  await client.query(
    `UPDATE processing_runs
     SET mold_used = $2,
         injection_pressure = $3,
         melt_temp_c = $4,
         cooling_time_s = $5,
         cycle_time_s = $6,
         machine_id = $7
     WHERE id = $1`,
    [existing.rows[0]['id'] as string, ...values]
  );
}

export class FormulationRepository {
  async findAll(limit = 50, offset = 0): Promise<{ data: FormulationListItem[]; total: number }> {
    const pool = getPool();
    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, formulation_code, produced_date
         FROM formulations
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) AS total FROM formulations'),
    ]);

    return {
      data: (dataResult.rows as FormulationRow[]).map(rowToListItem),
      total: parseInt(countResult.rows[0]['total'] as string, 10),
    };
  }

  async findById(id: string): Promise<FormulationDetailDto | null> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT id, formulation_code, produced_date
         FROM formulations
         WHERE id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return hydrateFormulation(client, result.rows[0] as FormulationRow);
    } finally {
      client.release();
    }
  }

  async findByCode(code: string): Promise<FormulationDetailDto | null> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT id, formulation_code, produced_date
         FROM formulations
         WHERE formulation_code = $1`,
        [code]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return hydrateFormulation(client, result.rows[0] as FormulationRow);
    } finally {
      client.release();
    }
  }

  async create(dto: CreateFormulationDto): Promise<FormulationDetailDto> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO formulations (formulation_code, name, produced_date, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, formulation_code, produced_date`,
        [
          dto.formulationCode,
          dto.formulationCode,
          dto.producedDate ?? null,
          dto.createdBy ?? 'system',
        ]
      );

      const row = result.rows[0] as FormulationRow;
      await replaceResinComponents(client, row.id, dto.resinComponents);
      await upsertManufacturingData(client, row.id, dto.manufacturingData);

      await client.query('COMMIT');
      return hydrateFormulation(client, row);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: string, dto: UpdateFormulationDto): Promise<FormulationDetailDto | null> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT id, formulation_code, produced_date
         FROM formulations
         WHERE id = $1`,
        [id]
      );

      if (existing.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      let row = existing.rows[0] as FormulationRow;

      if (dto.producedDate !== undefined) {
        const updated = await client.query(
          `UPDATE formulations
           SET produced_date = $2
           WHERE id = $1
           RETURNING id, formulation_code, produced_date`,
          [id, dto.producedDate ?? null]
        );
        row = updated.rows[0] as FormulationRow;
      }

      if (dto.resinComponents !== undefined) {
        await replaceResinComponents(client, id, dto.resinComponents);
      }

      await upsertManufacturingData(client, id, dto.manufacturingData);

      await client.query('COMMIT');
      return hydrateFormulation(client, row);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
