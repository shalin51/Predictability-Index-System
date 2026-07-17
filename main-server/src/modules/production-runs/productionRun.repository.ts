import type { PoolClient } from 'pg';
import { getPool } from '../../infrastructure/database/pg-pool';
import type { ProductionRunInput, ProductionRunListQuery, ProductionRunRecord, ProductionRunStatus } from './productionRun.types';
import { buildSamples } from './sample.repository';

export class ProductionRunRepository {
  async list(query: ProductionRunListQuery): Promise<ProductionRunRecord[]> {
    const params: unknown[] = [];
    const clauses: string[] = [];

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      clauses.push(`(
        LOWER(pr.run_code) LIKE $${params.length}
        OR LOWER(f.formulation_code) LIKE $${params.length}
        OR LOWER(COALESCE(bp.benchmark_name, '')) LIKE $${params.length}
      )`);
    }

    if (query.status && query.status !== 'all') {
      params.push(query.status);
      clauses.push(`pr.status::text = $${params.length}`);
    }

    if (query.formulationId) {
      params.push(query.formulationId);
      clauses.push(`pr.formulation_id = $${params.length}`);
    }

    if (query.machineId) {
      params.push(query.machineId);
      clauses.push(`pr.machine_id = $${params.length}`);
    }

    if (query.moldId) {
      params.push(query.moldId);
      clauses.push(`pr.mold_id = $${params.length}`);
    }

    if (query.targetBenchmarkId) {
      params.push(query.targetBenchmarkId);
      clauses.push(`f.target_benchmark_id = $${params.length}`);
    }

    if (query.dateProduced) {
      params.push(query.dateProduced);
      clauses.push(`pr.date_produced = $${params.length}::date`);
    }

    const result = await getPool().query(
      `${this.baseSelect()}
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       GROUP BY pr.id, f.formulation_code, f.version_no, f.target_benchmark_id, bp.benchmark_name, bp.benchmark_code, m.machine_code, mo.mold_code
       ORDER BY pr.updated_at DESC`,
      params
    );
    return result.rows as ProductionRunRecord[];
  }

  async findById(id: string): Promise<ProductionRunRecord | null> {
    const result = await getPool().query(
      `${this.baseSelect()}
       WHERE pr.id = $1
       GROUP BY pr.id, f.formulation_code, f.version_no, f.target_benchmark_id, bp.benchmark_name, bp.benchmark_code, m.machine_code, mo.mold_code`,
      [id]
    );
    return (result.rows[0] as ProductionRunRecord | undefined) ?? null;
  }

  async formulationOption(id: string): Promise<ProductionRunRecord | null> {
    const result = await getPool().query(
      `SELECT f.id, f.formulation_code AS "formulationCode", f.version_no AS "versionNo",
              CONCAT(f.formulation_code, ' V', f.version_no) AS label,
              f.target_benchmark_id AS "targetBenchmarkId", bp.benchmark_name AS "targetBenchmark",
              f.status::text AS status
       FROM formulations f
       LEFT JOIN benchmark_profiles bp ON bp.id = f.target_benchmark_id
       WHERE f.id = $1`,
      [id]
    );
    return (result.rows[0] as ProductionRunRecord | undefined) ?? null;
  }

  async approvedFormulationOptions(): Promise<ProductionRunRecord[]> {
    const result = await getPool().query(
      `SELECT f.id, CONCAT(f.formulation_code, ' V', f.version_no) AS label,
              f.formulation_code AS "formulationCode", f.version_no AS "versionNo",
              f.target_benchmark_id AS "targetBenchmarkId", bp.benchmark_name AS "targetBenchmark"
       FROM formulations f
       LEFT JOIN benchmark_profiles bp ON bp.id = f.target_benchmark_id
       WHERE f.status = 'approved'
       ORDER BY f.formulation_code, f.version_no`
    );
    return result.rows as ProductionRunRecord[];
  }

  async create(input: ProductionRunInput): Promise<ProductionRunRecord> {
    const id = await this.withTransaction(async (client) => {
      const runCode = input.runCode || await this.nextRunCode(client, input.formulationId);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO production_runs
          (run_code, formulation_id, date_produced, machine_id, mold_id,
           injection_pressure, injection_pressure_unit, melt_temperature, melt_temperature_unit,
           cooling_time, cooling_time_unit, cycle_time, cycle_time_unit, cure_hours_before_test, status)
         VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::production_run_status)
         RETURNING id`,
        [
          runCode,
          input.formulationId,
          input.dateProduced,
          input.machineId,
          input.moldId,
          input.injectionPressure,
          input.injectionPressureUnit,
          input.meltTemperature,
          input.meltTemperatureUnit,
          input.coolingTime,
          input.coolingTimeUnit,
          input.cycleTime,
          input.cycleTimeUnit,
          input.cureHoursBeforeTest,
          input.status ?? 'planned',
        ]
      );
      const productionRunId = inserted.rows[0]?.id ?? '';
      if (input.sampleGeneration) {
        for (const sample of buildSamples(input.sampleGeneration)) {
          await client.query(
            `INSERT INTO samples (production_run_id, sample_code, cavity_number)
             VALUES ($1, $2, $3)`,
            [productionRunId, sample.sampleCode, sample.cavityNumber ?? null]
          );
        }
      }
      return productionRunId;
    });
    return (await this.findById(id)) as ProductionRunRecord;
  }

  async update(id: string, input: ProductionRunInput): Promise<ProductionRunRecord | null> {
    await getPool().query(
      `UPDATE production_runs
       SET run_code = COALESCE(NULLIF($2, ''), run_code),
           date_produced = COALESCE($3::date, date_produced),
           machine_id = COALESCE($4, machine_id),
           mold_id = COALESCE($5, mold_id),
           injection_pressure = $6,
           injection_pressure_unit = COALESCE(NULLIF($7, ''), injection_pressure_unit),
           melt_temperature = $8,
           melt_temperature_unit = COALESCE(NULLIF($9, ''), melt_temperature_unit),
           cooling_time = $10,
           cooling_time_unit = COALESCE(NULLIF($11, ''), cooling_time_unit),
           cycle_time = $12,
           cycle_time_unit = COALESCE(NULLIF($13, ''), cycle_time_unit),
           cure_hours_before_test = COALESCE($14, cure_hours_before_test),
           updated_at = now()
       WHERE id = $1`,
      [
        id,
        input.runCode ?? '',
        input.dateProduced || null,
        input.machineId || null,
        input.moldId || null,
        input.injectionPressure,
        input.injectionPressureUnit,
        input.meltTemperature,
        input.meltTemperatureUnit,
        input.coolingTime,
        input.coolingTimeUnit,
        input.cycleTime,
        input.cycleTimeUnit,
        input.cureHoursBeforeTest,
      ]
    );
    return this.findById(id);
  }

  async updateStatus(id: string, status: ProductionRunStatus): Promise<ProductionRunRecord | null> {
    await getPool().query('UPDATE production_runs SET status = $2::production_run_status, updated_at = now() WHERE id = $1', [id, status]);
    return this.findById(id);
  }

  async archive(id: string): Promise<ProductionRunRecord | null> {
    await getPool().query(
      `UPDATE production_runs SET status = 'archived', archived_at = now(), updated_at = now() WHERE id = $1`,
      [id]
    );
    return this.findById(id);
  }

  async audit(id: string): Promise<ProductionRunRecord[]> {
    const result = await getPool().query(
      `SELECT id, action, changed_by AS "changedBy", old_values AS "oldValues", new_values AS "newValues", created_at AS "createdAt"
       FROM audit_log
       WHERE table_name = 'production_runs' AND record_id = $1
       ORDER BY created_at DESC`,
      [id]
    );
    return result.rows as ProductionRunRecord[];
  }

  async existsByRunCode(runCode: string, excludeId?: string): Promise<boolean> {
    const params: unknown[] = [runCode];
    const exclude = excludeId ? 'AND id <> $2' : '';
    if (excludeId) params.push(excludeId);
    const result = await getPool().query(`SELECT 1 FROM production_runs WHERE run_code = $1 ${exclude} LIMIT 1`, params);
    return (result.rowCount ?? 0) > 0;
  }

  private async nextRunCode(client: PoolClient, formulationId: string): Promise<string> {
    const formulation = await client.query<{ formulation_code: string }>('SELECT formulation_code FROM formulations WHERE id = $1', [formulationId]);
    const code = formulation.rows[0]?.formulation_code ?? 'RUN';
    const result = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM production_runs WHERE formulation_id = $1', [formulationId]);
    const suffix = String.fromCharCode(65 + Number(result.rows[0]?.count ?? 0));
    return `${code}-RUN-${suffix}`;
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
    return `SELECT pr.id, pr.run_code AS "runCode", pr.formulation_id AS "formulationId",
                   CONCAT(f.formulation_code, ' V', f.version_no) AS formulation,
                   f.target_benchmark_id AS "targetBenchmarkId",
                   bp.benchmark_name AS "targetBenchmark", bp.benchmark_code AS "targetBenchmarkCode",
                   pr.date_produced AS "dateProduced", pr.machine_id AS "machineId", m.machine_code AS machine,
                   pr.mold_id AS "moldId", mo.mold_code AS mold,
                   pr.injection_pressure::float AS "injectionPressure", pr.injection_pressure_unit AS "injectionPressureUnit",
                   pr.melt_temperature::float AS "meltTemperature", pr.melt_temperature_unit AS "meltTemperatureUnit",
                   pr.cooling_time::float AS "coolingTime", pr.cooling_time_unit AS "coolingTimeUnit",
                   pr.cycle_time::float AS "cycleTime", pr.cycle_time_unit AS "cycleTimeUnit",
                   pr.cure_hours_before_test::float AS "cureHoursBeforeTest",
                   pr.process_setup_revision_id AS "processSetupRevisionId",
                   pr.job_name AS "jobName", pr.part_number AS "partNumber",
                   pr.operator_name AS "operatorName", pr.shift_code AS "shiftCode",
                   pr.status::text AS status, COUNT(s.id)::int AS "sampleCount",
                   pr.created_at AS "createdAt", pr.updated_at AS "updatedAt"
            FROM production_runs pr
            JOIN formulations f ON f.id = pr.formulation_id
            LEFT JOIN benchmark_profiles bp ON bp.id = f.target_benchmark_id
            JOIN machines m ON m.id = pr.machine_id
            JOIN molds mo ON mo.id = pr.mold_id
            LEFT JOIN samples s ON s.production_run_id = pr.id AND s.status <> 'archived'`;
  }
}
