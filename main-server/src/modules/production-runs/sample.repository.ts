import { getPool } from '../../infrastructure/database/pg-pool';
import type { ProductionRunRecord, SampleGenerationInput, SampleInput } from './productionRun.types';

export class SampleRepository {
  async countByRun(productionRunId: string): Promise<number> {
    const result = await getPool().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM samples WHERE production_run_id = $1 AND status <> 'archived'`,
      [productionRunId]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async listByRun(productionRunId: string): Promise<ProductionRunRecord[]> {
    const result = await getPool().query(
      `SELECT id, production_run_id AS "productionRunId", sample_code AS "sampleCode",
              cavity_number AS "cavityNumber", status::text AS status,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM samples
       WHERE production_run_id = $1 AND status <> 'archived'
       ORDER BY sample_code`,
      [productionRunId]
    );
    return result.rows as ProductionRunRecord[];
  }

  async generate(productionRunId: string, input: SampleGenerationInput): Promise<ProductionRunRecord[]> {
    const samples = buildSamples(input);
    for (const sample of samples) {
      await getPool().query(
        `INSERT INTO samples (production_run_id, sample_code, cavity_number)
         VALUES ($1, $2, $3)`,
        [productionRunId, sample.sampleCode, sample.cavityNumber ?? null]
      );
    }
    return this.listByRun(productionRunId);
  }

  async nextAvailableStartingCode(startingCode: string): Promise<string> {
    const match = startingCode.match(/^(.*?)(\d+)$/);
    if (!match) return startingCode;
    const prefix = match[1] ?? '';
    const width = (match[2] ?? '1').length;
    const result = await getPool().query<{ sample_code: string }>(`SELECT sample_code FROM samples WHERE sample_code LIKE $1`, [`${prefix}%`]);
    const max = result.rows.reduce((highest, row) => {
      const suffix = row.sample_code.slice(prefix.length);
      return /^\d+$/.test(suffix) ? Math.max(highest, Number(suffix)) : highest;
    }, 0);
    return `${prefix}${String(max + 1).padStart(width, '0')}`;
  }

  async update(id: string, input: SampleInput): Promise<ProductionRunRecord | null> {
    const result = await getPool().query(
      `UPDATE samples
       SET sample_code = $2,
           cavity_number = $3,
           status = COALESCE($4::sample_status, status),
           updated_at = now()
       WHERE id = $1
       RETURNING id, production_run_id AS "productionRunId", sample_code AS "sampleCode",
                 cavity_number AS "cavityNumber", status::text AS status,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, input.sampleCode, input.cavityNumber ?? null, input.status ?? null]
    );
    return (result.rows[0] as ProductionRunRecord | undefined) ?? null;
  }

  async archive(id: string): Promise<ProductionRunRecord | null> {
    const result = await getPool().query(
      `UPDATE samples
       SET status = 'archived', archived_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING id, production_run_id AS "productionRunId", sample_code AS "sampleCode",
                 cavity_number AS "cavityNumber", status::text AS status,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id]
    );
    return (result.rows[0] as ProductionRunRecord | undefined) ?? null;
  }

  async productionRunStatus(id: string): Promise<string | null> {
    const result = await getPool().query<{ status: string }>(`SELECT pr.status::text AS status FROM samples s JOIN production_runs pr ON pr.id = s.production_run_id WHERE s.id = $1`, [id]);
    return result.rows[0]?.status ?? null;
  }

  async existsByCode(sampleCode: string, excludeId?: string): Promise<boolean> {
    const params: unknown[] = [sampleCode];
    const exclude = excludeId ? 'AND id <> $2' : '';
    if (excludeId) params.push(excludeId);
    const result = await getPool().query(`SELECT 1 FROM samples WHERE sample_code = $1 ${exclude} LIMIT 1`, params);
    return (result.rowCount ?? 0) > 0;
  }
}

export function buildSamples(input: SampleGenerationInput): SampleInput[] {
  return Array.from({ length: input.count }, (_, index) => ({
    cavityNumber: input.cavityAssignments?.[index] ?? null,
    sampleCode: incrementSampleCode(input.startingSampleCode, index),
    status: 'created',
  }));
}

function incrementSampleCode(startingCode: string, offset: number): string {
  const match = startingCode.match(/^(.*?)(\d+)$/);
  if (!match) return offset === 0 ? startingCode : `${startingCode}-${offset + 1}`;
  const prefix = match[1] ?? '';
  const digits = match[2] ?? '1';
  return `${prefix}${String(Number(digits) + offset).padStart(digits.length, '0')}`;
}
