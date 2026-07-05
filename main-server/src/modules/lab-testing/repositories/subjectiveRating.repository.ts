import { getPool } from '../../../infrastructure/database/pg-pool';
import type { LabTestingRecord, SubjectiveRatingInput } from '../labTesting.types';

export class SubjectiveRatingRepository {
  async create(input: SubjectiveRatingInput): Promise<LabTestingRecord> {
    if (!input.metricId) {
      const existing = await getPool().query<{ id: string }>(
        `SELECT id FROM sample_subjective_ratings WHERE sample_id = $1 AND metric_id IS NULL ORDER BY updated_at DESC LIMIT 1`,
        [input.sampleId]
      );
      if (existing.rows[0]?.id) return (await this.update(existing.rows[0].id, input)) as LabTestingRecord;
    }

    const result = await getPool().query(
      `INSERT INTO sample_subjective_ratings
        (sample_id, metric_id, rating_value, feedback_text, rated_by, rated_at, audit_reason)
       VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), COALESCE($6::timestamptz, now()), NULLIF($7, ''))
       ON CONFLICT (sample_id, metric_id) DO UPDATE
       SET rating_value = EXCLUDED.rating_value,
           feedback_text = EXCLUDED.feedback_text,
           rated_by = EXCLUDED.rated_by,
           rated_at = EXCLUDED.rated_at,
           audit_reason = EXCLUDED.audit_reason,
           updated_at = now()
       RETURNING id`,
      [
        input.sampleId,
        input.metricId ?? null,
        input.ratingValue ?? null,
        input.feedbackText ?? '',
        input.ratedBy ?? '',
        input.ratedAt || null,
        input.auditReason ?? '',
      ]
    );
    return (await this.findById(result.rows[0]?.id)) as LabTestingRecord;
  }

  async update(id: string, input: SubjectiveRatingInput): Promise<LabTestingRecord | null> {
    await getPool().query(
      `UPDATE sample_subjective_ratings
       SET sample_id = COALESCE(NULLIF($2, '')::uuid, sample_id),
           metric_id = $3,
           rating_value = $4,
           feedback_text = COALESCE(NULLIF($5, ''), feedback_text),
           rated_by = COALESCE(NULLIF($6, ''), rated_by),
           rated_at = COALESCE($7::timestamptz, rated_at),
           audit_reason = NULLIF($8, ''),
           updated_at = now()
       WHERE id = $1`,
      [
        id,
        input.sampleId,
        input.metricId ?? null,
        input.ratingValue ?? null,
        input.feedbackText ?? '',
        input.ratedBy ?? '',
        input.ratedAt || null,
        input.auditReason ?? '',
      ]
    );
    return this.findById(id);
  }

  async findById(id: string): Promise<LabTestingRecord | null> {
    const result = await getPool().query(
      `SELECT id, sample_id AS "sampleId", metric_id AS "metricId",
              rating_value::float AS "ratingValue", feedback_text AS "feedbackText",
              rated_by AS "ratedBy", rated_at AS "ratedAt", audit_reason AS "auditReason",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM sample_subjective_ratings
       WHERE id = $1`,
      [id]
    );
    return (result.rows[0] as LabTestingRecord | undefined) ?? null;
  }
}
