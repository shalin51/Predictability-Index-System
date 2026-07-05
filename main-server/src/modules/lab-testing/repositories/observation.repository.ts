import { getPool } from '../../../infrastructure/database/pg-pool';
import type { LabTestingRecord, ObservationInput } from '../labTesting.types';

export class ObservationRepository {
  async create(input: ObservationInput): Promise<LabTestingRecord> {
    const result = await getPool().query(
      `INSERT INTO sample_observations
        (sample_id, observation_type, observation_text, observed_by, observed_at, audit_reason)
       VALUES ($1, $2, $3, NULLIF($4, ''), COALESCE($5::timestamptz, now()), NULLIF($6, ''))
       RETURNING id`,
      [
        input.sampleId,
        input.observationType || 'general',
        input.observationText,
        input.observedBy ?? '',
        input.observedAt || null,
        input.auditReason ?? '',
      ]
    );
    return (await this.findById(result.rows[0]?.id)) as LabTestingRecord;
  }

  async update(id: string, input: ObservationInput): Promise<LabTestingRecord | null> {
    await getPool().query(
      `UPDATE sample_observations
       SET sample_id = COALESCE(NULLIF($2, '')::uuid, sample_id),
           observation_type = COALESCE(NULLIF($3, ''), observation_type),
           observation_text = COALESCE(NULLIF($4, ''), observation_text),
           observed_by = COALESCE(NULLIF($5, ''), observed_by),
           observed_at = COALESCE($6::timestamptz, observed_at),
           audit_reason = NULLIF($7, ''),
           updated_at = now()
       WHERE id = $1`,
      [
        id,
        input.sampleId,
        input.observationType ?? '',
        input.observationText,
        input.observedBy ?? '',
        input.observedAt || null,
        input.auditReason ?? '',
      ]
    );
    return this.findById(id);
  }

  async findById(id: string): Promise<LabTestingRecord | null> {
    const result = await getPool().query(
      `SELECT id, sample_id AS "sampleId", observation_type AS "observationType",
              observation_text AS "observationText", observed_by AS "observedBy",
              observed_at AS "observedAt", audit_reason AS "auditReason",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM sample_observations
       WHERE id = $1`,
      [id]
    );
    return (result.rows[0] as LabTestingRecord | undefined) ?? null;
  }
}
