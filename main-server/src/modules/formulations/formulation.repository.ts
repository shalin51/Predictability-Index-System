import type { PoolClient } from 'pg';
import { getPool } from '../../infrastructure/database/pg-pool';
import type {
  FormulationComponentInput,
  FormulationListQuery,
  FormulationOptions,
  FormulationRecord,
  FormulationSaveInput,
} from './formulation.types';

export class FormulationRepository {
  async list(query: FormulationListQuery): Promise<FormulationRecord[]> {
    const params: unknown[] = [];
    const clauses: string[] = [];

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      clauses.push(`(
        LOWER(f.formulation_code) LIKE $${params.length}
        OR LOWER(COALESCE(ff.family_name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(bp.benchmark_name, '')) LIKE $${params.length}
      )`);
    }

    if (query.status && query.status !== 'all') {
      params.push(query.status);
      clauses.push(`f.status::text = $${params.length}`);
    }

    if (query.targetBenchmarkId) {
      params.push(query.targetBenchmarkId);
      clauses.push(`f.target_benchmark_id = $${params.length}`);
    }

    if (query.materialId) {
      params.push(query.materialId);
      clauses.push(`EXISTS (
        SELECT 1 FROM formulation_components fc_filter
        WHERE fc_filter.formulation_id = f.id AND fc_filter.material_id = $${params.length}
      )`);
    }

    if (query.createdFrom) {
      params.push(query.createdFrom);
      clauses.push(`f.created_at::date >= $${params.length}::date`);
    }

    if (query.createdTo) {
      params.push(query.createdTo);
      clauses.push(`f.created_at::date <= $${params.length}::date`);
    }

    const result = await getPool().query(
      `${this.baseSelect()}
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       GROUP BY f.id, e.experiment_name, ff.family_name, bp.benchmark_name, bp.benchmark_code
       ORDER BY f.updated_at DESC`,
      params
    );
    return result.rows as FormulationRecord[];
  }

  async findById(id: string): Promise<FormulationRecord | null> {
    const result = await getPool().query(
      `${this.baseSelect()}
       WHERE f.id = $1
       GROUP BY f.id, e.experiment_name, ff.family_name, bp.benchmark_name, bp.benchmark_code`,
      [id]
    );
    const record = result.rows[0] as FormulationRecord | undefined;
    if (!record) return null;
    record['components'] = await this.components(id);
    return record;
  }

  async rawById(id: string, client: PoolClient = getPool() as unknown as PoolClient): Promise<FormulationRecord | null> {
    const result = await client.query('SELECT * FROM formulations WHERE id = $1', [id]);
    return (result.rows[0] as FormulationRecord | undefined) ?? null;
  }

  async create(input: FormulationSaveInput): Promise<FormulationRecord> {
    const id = await this.withTransaction(async (client) => {
      const familyId = await this.resolveFamily(client, input);
      const experimentId = await this.resolveExperiment(client, input);
      const formulationCode = input.formulationCode || await this.nextCode(client);
      const status = input.approve ? 'approved' : 'draft';

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO formulations
          (formulation_code, version_no, experiment_id, family_id, target_benchmark_id, status, notes)
         VALUES ($1, 1, $2, $3, $4, $5::formulation_status, $6)
         RETURNING id`,
        [formulationCode, experimentId, familyId, input.targetBenchmarkId, status, input.notes]
      );

      const id = inserted.rows[0]?.id ?? '';
      await this.replaceComponents(client, id, input.components);
      return id;
    });
    return (await this.findById(id)) as FormulationRecord;
  }

  async update(id: string, input: FormulationSaveInput): Promise<FormulationRecord | null> {
    await this.withTransaction(async (client) => {
      const familyId = await this.resolveFamily(client, input);
      const experimentId = await this.resolveExperiment(client, input);
      await client.query(
        `UPDATE formulations
         SET formulation_code = COALESCE(NULLIF($2, ''), formulation_code),
             experiment_id = $3,
             family_id = $4,
             target_benchmark_id = $5,
             notes = $6,
             updated_at = now()
         WHERE id = $1`,
        [id, input.formulationCode ?? '', experimentId, familyId, input.targetBenchmarkId, input.notes]
      );
      await this.replaceComponents(client, id, input.components);
    });
    return this.findById(id);
  }

  async approve(id: string): Promise<FormulationRecord | null> {
    await getPool().query(
      `UPDATE formulations SET status = 'approved', updated_at = now() WHERE id = $1 AND status = 'draft'`,
      [id]
    );
    return this.findById(id);
  }

  async archive(id: string): Promise<FormulationRecord | null> {
    await getPool().query(
      `UPDATE formulations SET status = 'archived', archived_at = now(), updated_at = now() WHERE id = $1`,
      [id]
    );
    return this.findById(id);
  }

  async duplicate(id: string): Promise<FormulationRecord | null> {
    const duplicatedId = await this.withTransaction(async (client) => {
      const source = await client.query<FormulationRecord>('SELECT * FROM formulations WHERE id = $1', [id]);
      const row = source.rows[0];
      if (!row) return null;

      const nextVersion = await client.query<{ version_no: number }>(
        'SELECT COALESCE(MAX(version_no), 0) + 1 AS version_no FROM formulations WHERE formulation_code = $1',
        [row['formulation_code']]
      );

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO formulations
          (formulation_code, version_no, experiment_id, family_id, target_benchmark_id, status, notes)
         VALUES ($1, $2, $3, $4, $5, 'draft', $6)
         RETURNING id`,
        [
          row['formulation_code'],
          nextVersion.rows[0]?.version_no ?? 1,
          row['experiment_id'],
          row['family_id'],
          row['target_benchmark_id'],
          row['notes'],
        ]
      );

      await client.query(
        `INSERT INTO formulation_components
          (formulation_id, material_id, supplier_id, material_lot_id, percent_composition, basis, sort_order)
         SELECT $1, material_id, supplier_id, material_lot_id, percent_composition, basis, sort_order
         FROM formulation_components
         WHERE formulation_id = $2
         ORDER BY sort_order, created_at`,
        [inserted.rows[0]?.id, id]
      );

      return inserted.rows[0]?.id ?? null;
    });
    return duplicatedId ? this.findById(duplicatedId) : null;
  }

  async options(): Promise<FormulationOptions> {
    const [experiments, families] = await Promise.all([
      getPool().query(
        `SELECT id, experiment_name AS label, experiment_code AS code
         FROM experiments
         WHERE status = 'active'
         ORDER BY experiment_name`
      ),
      getPool().query(
        `SELECT id, family_name AS label
         FROM formulation_families
         WHERE status = 'active'
         ORDER BY family_name`
      ),
    ]);
    return {
      experiments: experiments.rows as FormulationRecord[],
      families: families.rows as FormulationRecord[],
    };
  }

  async audit(id: string): Promise<FormulationRecord[]> {
    const result = await getPool().query(
      `SELECT id, action, changed_by AS "changedBy", old_values AS "oldValues", new_values AS "newValues", created_at AS "createdAt"
       FROM audit_log
       WHERE table_name = 'formulations' AND record_id = $1
       ORDER BY created_at DESC`,
      [id]
    );
    return result.rows as FormulationRecord[];
  }

  async validateReferences(components: FormulationComponentInput[], targetBenchmarkId: string | null | undefined): Promise<string[]> {
    const warnings: string[] = [];
    if (targetBenchmarkId) {
      const benchmark = await getPool().query('SELECT 1 FROM benchmark_profiles WHERE id = $1 AND status = $2 LIMIT 1', [targetBenchmarkId, 'active']);
      if ((benchmark.rowCount ?? 0) === 0) warnings.push('Target benchmark is inactive or missing');
    }

    for (const component of components) {
      const lotId = component.materialLotId;
      if (!lotId) continue;
      const result = await getPool().query<{ status: string; material_id: string; supplier_id: string }>(
        `SELECT ml.status::text, sm.material_id, sm.supplier_id
         FROM material_lots ml
         JOIN supplier_materials sm ON sm.id = ml.supplier_material_id
         WHERE ml.id = $1`,
        [lotId]
      );
      const lot = result.rows[0];
      if (!lot) {
        warnings.push(`Material lot ${lotId} is missing`);
        continue;
      }
      if (lot.status !== 'active') warnings.push(`Material lot ${lotId} is inactive`);
      if (lot.material_id !== component.materialId || lot.supplier_id !== component.supplierId) {
        warnings.push(`Material lot ${lotId} does not match selected material and supplier`);
      }
    }

    return warnings;
  }

  private async components(id: string): Promise<FormulationRecord[]> {
    const result = await getPool().query(
      `SELECT fc.id, fc.material_id AS "materialId", m.material_code AS "materialCode",
              m.material_name AS "materialName", fc.supplier_id AS "supplierId",
              s.supplier_name AS "supplierName", fc.material_lot_id AS "materialLotId",
              ml.lot_number AS "lotNumber", ml.status::text AS "lotStatus",
              fc.percent_composition::float AS "percentComposition", fc.basis, fc.sort_order AS "sortOrder"
       FROM formulation_components fc
       JOIN materials m ON m.id = fc.material_id
       JOIN suppliers s ON s.id = fc.supplier_id
       LEFT JOIN material_lots ml ON ml.id = fc.material_lot_id
       WHERE fc.formulation_id = $1
       ORDER BY fc.sort_order, fc.created_at`,
      [id]
    );
    return result.rows as FormulationRecord[];
  }

  private async replaceComponents(client: PoolClient, id: string, components: FormulationComponentInput[]): Promise<void> {
    await client.query('DELETE FROM formulation_components WHERE formulation_id = $1', [id]);
    for (const [index, component] of components.entries()) {
      await client.query(
        `INSERT INTO formulation_components
          (formulation_id, material_id, supplier_id, material_lot_id, percent_composition, basis, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          component.materialId,
          component.supplierId,
          component.materialLotId || null,
          component.percentComposition,
          component.basis || 'weight_percent',
          index,
        ]
      );
    }
  }

  private async resolveExperiment(client: PoolClient, input: FormulationSaveInput): Promise<string | null> {
    if (input.experimentId) return input.experimentId;
    if (!input.experimentName) return null;
    const result = await client.query<{ id: string }>(
      `INSERT INTO experiments (experiment_name)
       VALUES ($1)
       ON CONFLICT (experiment_name) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [input.experimentName]
    );
    return result.rows[0]?.id ?? null;
  }

  private async resolveFamily(client: PoolClient, input: FormulationSaveInput): Promise<string | null> {
    if (input.familyId) return input.familyId;
    if (!input.formulationFamily) return null;
    const result = await client.query<{ id: string }>(
      `INSERT INTO formulation_families (family_name)
       VALUES ($1)
       ON CONFLICT (family_name) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [input.formulationFamily]
    );
    return result.rows[0]?.id ?? null;
  }

  private async nextCode(client: PoolClient): Promise<string> {
    const year = new Date().getFullYear();
    const result = await client.query<{ next_value: string }>(
      `SELECT LPAD((COUNT(*) + 1)::text, 3, '0') AS next_value
       FROM formulations
       WHERE formulation_code LIKE $1`,
      [`F-${year}-%`]
    );
    return `F-${year}-${result.rows[0]?.next_value ?? '001'}`;
  }

  private async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private baseSelect(): string {
    return `SELECT f.id, f.formulation_code AS "formulationCode", f.version_no AS "versionNo",
                   CONCAT('V', f.version_no) AS version,
                   f.experiment_id AS "experimentId", e.experiment_name AS "experimentName",
                   f.family_id AS "familyId", ff.family_name AS family,
                   f.target_benchmark_id AS "targetBenchmarkId",
                   bp.benchmark_name AS "targetBenchmark", bp.benchmark_code AS "targetBenchmarkCode",
                   f.status::text AS status, COALESCE(SUM(fc.percent_composition), 0)::float AS "componentsTotal",
                   f.notes, f.created_at AS "createdAt", f.updated_at AS "updatedAt"
            FROM formulations f
            LEFT JOIN experiments e ON e.id = f.experiment_id
            LEFT JOIN formulation_families ff ON ff.id = f.family_id
            LEFT JOIN benchmark_profiles bp ON bp.id = f.target_benchmark_id
            LEFT JOIN formulation_components fc ON fc.formulation_id = f.id`;
  }
}
