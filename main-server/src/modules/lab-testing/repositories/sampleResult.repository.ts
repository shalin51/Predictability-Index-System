import { getPool } from '../../../infrastructure/database/pg-pool';
import type { LabTestingRecord, SampleResultInput } from '../labTesting.types';

export class SampleResultRepository {
  async create(input: SampleResultInput): Promise<LabTestingRecord> {
    const result = await getPool().query(
      `INSERT INTO sample_test_results
        (sample_id, metric_id, test_method_id, value_numeric, unit, tested_by, tested_at, audit_reason)
       VALUES ($1, $2, $3, $4, COALESCE(NULLIF($5, ''), (SELECT default_unit FROM metric_definitions WHERE id = $2)),
               NULLIF($6, ''), COALESCE($7::timestamptz, now()), NULLIF($8, ''))
       ON CONFLICT (sample_id, metric_id, test_method_id) DO UPDATE
       SET value_numeric = EXCLUDED.value_numeric,
           unit = EXCLUDED.unit,
           tested_by = EXCLUDED.tested_by,
           tested_at = EXCLUDED.tested_at,
           audit_reason = EXCLUDED.audit_reason,
           updated_at = now()
       RETURNING id`,
      [
        input.sampleId,
        input.metricId,
        input.testMethodId ?? null,
        input.valueNumeric,
        input.unit ?? '',
        input.testedBy ?? '',
        input.testedAt || null,
        input.auditReason ?? '',
      ]
    );
    return (await this.findById(result.rows[0]?.id)) as LabTestingRecord;
  }

  async update(id: string, input: SampleResultInput): Promise<LabTestingRecord | null> {
    await getPool().query(
      `UPDATE sample_test_results
       SET sample_id = COALESCE(NULLIF($2, '')::uuid, sample_id),
           metric_id = COALESCE(NULLIF($3, '')::uuid, metric_id),
           test_method_id = $4,
           value_numeric = $5,
           unit = COALESCE(NULLIF($6, ''), unit),
           tested_by = COALESCE(NULLIF($7, ''), tested_by),
           tested_at = COALESCE($8::timestamptz, tested_at),
           audit_reason = NULLIF($9, ''),
           updated_at = now()
       WHERE id = $1`,
      [
        id,
        input.sampleId,
        input.metricId,
        input.testMethodId ?? null,
        input.valueNumeric,
        input.unit ?? '',
        input.testedBy ?? '',
        input.testedAt || null,
        input.auditReason ?? '',
      ]
    );
    return this.findById(id);
  }

  async findById(id: string): Promise<LabTestingRecord | null> {
    const result = await getPool().query(
      `SELECT id, sample_id AS "sampleId", metric_id AS "metricId", test_method_id AS "testMethodId",
              value_numeric::float AS "valueNumeric", unit, tested_by AS "testedBy",
              tested_at AS "testedAt", audit_reason AS "auditReason",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM sample_test_results
       WHERE id = $1`,
      [id]
    );
    return (result.rows[0] as LabTestingRecord | undefined) ?? null;
  }

  async sampleIsCompleted(sampleId: string): Promise<boolean> {
    const result = await getPool().query<{ completed: boolean }>(
      `SELECT NOT EXISTS (
         SELECT 1
         FROM metric_definitions md
         LEFT JOIN sample_test_results str ON str.sample_id = $1 AND str.metric_id = md.id
         WHERE md.required_for_scoring = true AND md.status = 'active' AND str.id IS NULL
       ) AS completed`,
      [sampleId]
    );
    return result.rows[0]?.completed === true;
  }

  async updateSampleStatus(sampleId: string, status: 'testing' | 'tested'): Promise<void> {
    await getPool().query(`UPDATE samples SET status = $2::sample_status, updated_at = now() WHERE id = $1`, [sampleId, status]);
  }
}
