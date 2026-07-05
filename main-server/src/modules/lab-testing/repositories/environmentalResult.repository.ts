import { getPool } from '../../../infrastructure/database/pg-pool';
import type { EnvironmentalResultInput, LabTestingRecord } from '../labTesting.types';

export class EnvironmentalResultRepository {
  async create(input: EnvironmentalResultInput): Promise<LabTestingRecord> {
    const result = await getPool().query(
      `INSERT INTO environmental_test_results
        (sample_id, metric_id, test_condition_id, test_method_id, value_numeric, unit, tested_by, tested_at, audit_reason)
       VALUES ($1, $2, $3, $4, $5, COALESCE(NULLIF($6, ''), (SELECT default_unit FROM metric_definitions WHERE id = $2)),
               NULLIF($7, ''), COALESCE($8::timestamptz, now()), NULLIF($9, ''))
       ON CONFLICT (sample_id, metric_id, test_condition_id, test_method_id) DO UPDATE
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
        input.testConditionId ?? null,
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

  async update(id: string, input: EnvironmentalResultInput): Promise<LabTestingRecord | null> {
    await getPool().query(
      `UPDATE environmental_test_results
       SET sample_id = COALESCE(NULLIF($2, '')::uuid, sample_id),
           metric_id = COALESCE(NULLIF($3, '')::uuid, metric_id),
           test_condition_id = $4,
           test_method_id = $5,
           value_numeric = $6,
           unit = COALESCE(NULLIF($7, ''), unit),
           tested_by = COALESCE(NULLIF($8, ''), tested_by),
           tested_at = COALESCE($9::timestamptz, tested_at),
           audit_reason = NULLIF($10, ''),
           updated_at = now()
       WHERE id = $1`,
      [
        id,
        input.sampleId,
        input.metricId,
        input.testConditionId ?? null,
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
      `SELECT id, sample_id AS "sampleId", metric_id AS "metricId",
              test_condition_id AS "testConditionId", test_method_id AS "testMethodId",
              value_numeric::float AS "valueNumeric", unit, tested_by AS "testedBy",
              tested_at AS "testedAt", audit_reason AS "auditReason",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM environmental_test_results
       WHERE id = $1`,
      [id]
    );
    return (result.rows[0] as LabTestingRecord | undefined) ?? null;
  }
}
