import { getPool } from '../database/pg-pool';
import type {
  TestResult,
  DurabilityResult,
  EnvironmentalResult,
  SubjectiveRating,
  UpsertTestResultDto,
  UpsertDurabilityDto,
  UpsertEnvironmentalDto,
  UpsertSubjectiveRatingDto,
} from '@amfpi/shared';

// ─── helpers ────────────────────────────────────────────────

function toTestResult(r: Record<string, unknown>): TestResult {
  return {
    id: r['id'] as string,
    formulationId: r['formulation_id'] as string,
    testedAt: r['tested_at'] as string,
    testedBy: r['tested_by'] as string | undefined,
    weightG: r['weight_g'] != null ? Number(r['weight_g']) : undefined,
    diameterMm: r['diameter_mm'] != null ? Number(r['diameter_mm']) : undefined,
    wallThicknessMm: r['wall_thickness_mm'] != null ? Number(r['wall_thickness_mm']) : undefined,
    roundnessMm: r['roundness_mm'] != null ? Number(r['roundness_mm']) : undefined,
    balanceG: r['balance_g'] != null ? Number(r['balance_g']) : undefined,
    bounceCm: r['bounce_cm'] != null ? Number(r['bounce_cm']) : undefined,
    hardnessShorD: r['hardness_shore_d'] != null ? Number(r['hardness_shore_d']) : undefined,
    compressionKg: r['compression_kg'] != null ? Number(r['compression_kg']) : undefined,
    deflectionMm: r['deflection_mm'] != null ? Number(r['deflection_mm']) : undefined,
    coefficientOfRestitution: r['coefficient_of_restitution'] != null ? Number(r['coefficient_of_restitution']) : undefined,
    createdAt: r['created_at'] as string,
    updatedAt: r['updated_at'] as string,
  };
}

function toDurability(r: Record<string, unknown>): DurabilityResult {
  return {
    id: r['id'] as string,
    formulationId: r['formulation_id'] as string,
    testedAt: r['tested_at'] as string,
    testedBy: r['tested_by'] as string | undefined,
    airCannonCycles: r['air_cannon_cycles'] != null ? Number(r['air_cannon_cycles']) : undefined,
    crackInitiationCycles: r['crack_initiation_cycles'] != null ? Number(r['crack_initiation_cycles']) : undefined,
    crackPropagationObservations: r['crack_propagation_mm'] != null ? Number(r['crack_propagation_mm']) : undefined,
    deformationMm: r['deformation_mm'] != null ? Number(r['deformation_mm']) : undefined,
    createdAt: r['created_at'] as string,
    updatedAt: r['updated_at'] as string,
  };
}

function toEnv(r: Record<string, unknown>): EnvironmentalResult {
  return {
    id: r['id'] as string,
    formulationId: r['formulation_id'] as string,
    testedAt: r['tested_at'] as string,
    testedBy: r['tested_by'] as string | undefined,
    hotTemperaturePerformance: r['hot_performance_score'] != null ? Number(r['hot_performance_score']) : undefined,
    coldTemperaturePerformance: r['cold_performance_score'] != null ? Number(r['cold_performance_score']) : undefined,
    humidityExposureResults: r['humidity_performance_score'] != null ? Number(r['humidity_performance_score']) : undefined,
    createdAt: r['created_at'] as string,
    updatedAt: r['updated_at'] as string,
  };
}

function toSubjective(r: Record<string, unknown>): SubjectiveRating {
  return {
    id: r['id'] as string,
    formulationId: r['formulation_id'] as string,
    ratedAt: r['rated_at'] as string,
    ratedBy: r['rated_by'] as string | undefined,
    playerFeedback: r['notes'] as string | undefined,
    feelScore: r['feel_score'] != null ? Number(r['feel_score']) : undefined,
    soundScore: r['sound_score'] != null ? Number(r['sound_score']) : undefined,
    perceivedSpeedScore: r['perceived_speed_score'] != null ? Number(r['perceived_speed_score']) : undefined,
    perceivedDurabilityScore: r['perceived_durability_score'] != null ? Number(r['perceived_durability_score']) : undefined,
    createdAt: r['created_at'] as string,
    updatedAt: r['updated_at'] as string,
  };
}

function keepNumber(next: number | undefined, current: number | undefined): number | null {
  return next ?? current ?? null;
}

function keepString(next: string | undefined, current: string | undefined): string | null {
  return next ?? current ?? null;
}

// ─── Repository ──────────────────────────────────────────────

export class TestResultRepository {
  private async findLatestId(
    tableName: 'test_results' | 'durability_results' | 'environmental_results' | 'subjective_ratings',
    formulationId: string,
    orderColumn: 'tested_at' | 'rated_at'
  ): Promise<string | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id FROM ${tableName} WHERE formulation_id = $1 ORDER BY ${orderColumn} DESC LIMIT 1`,
      [formulationId]
    );
    return (result.rows[0]?.['id'] as string | undefined) ?? null;
  }

  // ── Physical / Performance ──────────────────────────────

  async findTestResultByFormulation(formulationId: string): Promise<TestResult | null> {
    const pool = getPool();
    const r = await pool.query(
      'SELECT * FROM test_results WHERE formulation_id = $1 ORDER BY tested_at DESC LIMIT 1',
      [formulationId]
    );
    return r.rowCount ? toTestResult(r.rows[0] as Record<string, unknown>) : null;
  }

  async upsertTestResult(formulationId: string, dto: UpsertTestResultDto): Promise<TestResult> {
    const pool = getPool();
    const latestId = await this.findLatestId('test_results', formulationId, 'tested_at');
    const testedAt = dto.testedAt ?? new Date().toISOString();
    const existing = latestId ? await this.findTestResultByFormulation(formulationId) : null;
    const insertParams = [
      formulationId,
      testedAt,
      keepString(dto.testedBy, existing?.testedBy),
      keepNumber(dto.weightG, existing?.weightG),
      keepNumber(dto.diameterMm, existing?.diameterMm),
      keepNumber(dto.wallThicknessMm, existing?.wallThicknessMm),
      keepNumber(dto.roundnessMm, existing?.roundnessMm),
      keepNumber(dto.balanceG, existing?.balanceG),
      keepNumber(dto.bounceCm, existing?.bounceCm),
      keepNumber(dto.hardnessShorD, existing?.hardnessShorD),
      keepNumber(dto.compressionKg, existing?.compressionKg),
      keepNumber(dto.deflectionMm, existing?.deflectionMm),
      keepNumber(dto.coefficientOfRestitution, existing?.coefficientOfRestitution),
    ];
    const updateParams = insertParams.slice(1);

    const r = latestId
      ? await pool.query(
          `UPDATE test_results
           SET tested_at = COALESCE($1, tested_at),
               tested_by = $2,
               weight_g = $3,
               diameter_mm = $4,
               wall_thickness_mm = $5,
               roundness_mm = $6,
               balance_g = $7,
               bounce_cm = $8,
               hardness_shore_d = $9,
               compression_kg = $10,
               deflection_mm = $11,
               coefficient_of_restitution = $12
           WHERE id = $13
           RETURNING *`,
          [...updateParams, latestId]
        )
      : await pool.query(
          `INSERT INTO test_results (formulation_id, tested_at, tested_by, weight_g, diameter_mm, wall_thickness_mm,
            roundness_mm, balance_g, bounce_cm, hardness_shore_d, compression_kg, deflection_mm, coefficient_of_restitution)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           RETURNING *`,
          insertParams
        );
    return toTestResult(r.rows[0] as Record<string, unknown>);
  }

  // ── Durability ──────────────────────────────────────────

  async findDurabilityByFormulation(formulationId: string): Promise<DurabilityResult | null> {
    const pool = getPool();
    const r = await pool.query(
      'SELECT * FROM durability_results WHERE formulation_id = $1 ORDER BY tested_at DESC LIMIT 1',
      [formulationId]
    );
    return r.rowCount ? toDurability(r.rows[0] as Record<string, unknown>) : null;
  }

  async upsertDurability(formulationId: string, dto: UpsertDurabilityDto): Promise<DurabilityResult> {
    const pool = getPool();
    const latestId = await this.findLatestId('durability_results', formulationId, 'tested_at');
    const testedAt = dto.testedAt ?? new Date().toISOString();
    const existing = latestId ? await this.findDurabilityByFormulation(formulationId) : null;
    const insertParams = [
      formulationId,
      testedAt,
      keepString(dto.testedBy, existing?.testedBy),
      keepNumber(dto.airCannonCycles, existing?.airCannonCycles),
      keepNumber(dto.crackInitiationCycles, existing?.crackInitiationCycles),
      keepNumber(dto.crackPropagationObservations, existing?.crackPropagationObservations),
      keepNumber(dto.deformationMm, existing?.deformationMm),
    ];
    const updateParams = insertParams.slice(1);
    const r = latestId
      ? await pool.query(
          `UPDATE durability_results
           SET tested_at = COALESCE($1, tested_at),
               tested_by = $2,
               air_cannon_cycles = $3,
               crack_initiation_cycles = $4,
               crack_propagation_mm = $5,
               deformation_mm = $6
           WHERE id = $7
           RETURNING *`,
          [...updateParams, latestId]
        )
      : await pool.query(
          `INSERT INTO durability_results (formulation_id, tested_at, tested_by, air_cannon_cycles,
            crack_initiation_cycles, crack_propagation_mm, deformation_mm)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING *`,
          insertParams
        );
    return toDurability(r.rows[0] as Record<string, unknown>);
  }

  // ── Environmental ───────────────────────────────────────

  async findEnvByFormulation(formulationId: string): Promise<EnvironmentalResult | null> {
    const pool = getPool();
    const r = await pool.query(
      'SELECT * FROM environmental_results WHERE formulation_id = $1 ORDER BY tested_at DESC LIMIT 1',
      [formulationId]
    );
    return r.rowCount ? toEnv(r.rows[0] as Record<string, unknown>) : null;
  }

  async upsertEnvironmental(formulationId: string, dto: UpsertEnvironmentalDto): Promise<EnvironmentalResult> {
    const pool = getPool();
    const latestId = await this.findLatestId('environmental_results', formulationId, 'tested_at');
    const testedAt = dto.testedAt ?? new Date().toISOString();
    const existing = latestId ? await this.findEnvByFormulation(formulationId) : null;
    const insertParams = [
      formulationId,
      testedAt,
      keepString(dto.testedBy, existing?.testedBy),
      keepNumber(dto.hotTemperaturePerformance, existing?.hotTemperaturePerformance),
      keepNumber(dto.coldTemperaturePerformance, existing?.coldTemperaturePerformance),
      keepNumber(dto.humidityExposureResults, existing?.humidityExposureResults),
    ];
    const updateParams = insertParams.slice(1);
    const r = latestId
      ? await pool.query(
          `UPDATE environmental_results
           SET tested_at = COALESCE($1, tested_at),
               tested_by = $2,
               hot_performance_score = $3,
               cold_performance_score = $4,
               humidity_performance_score = $5
           WHERE id = $6
           RETURNING *`,
          [...updateParams, latestId]
        )
      : await pool.query(
          `INSERT INTO environmental_results (formulation_id, tested_at, tested_by, hot_performance_score,
            cold_performance_score, humidity_performance_score)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING *`,
          insertParams
        );
    return toEnv(r.rows[0] as Record<string, unknown>);
  }

  // ── Subjective ──────────────────────────────────────────

  async findSubjectiveByFormulation(formulationId: string): Promise<SubjectiveRating | null> {
    const pool = getPool();
    const r = await pool.query(
      'SELECT * FROM subjective_ratings WHERE formulation_id = $1 ORDER BY rated_at DESC LIMIT 1',
      [formulationId]
    );
    return r.rowCount ? toSubjective(r.rows[0] as Record<string, unknown>) : null;
  }

  async upsertSubjective(formulationId: string, dto: UpsertSubjectiveRatingDto): Promise<SubjectiveRating> {
    const pool = getPool();
    const latestId = await this.findLatestId('subjective_ratings', formulationId, 'rated_at');
    const ratedAt = dto.ratedAt ?? new Date().toISOString();
    const existing = latestId ? await this.findSubjectiveByFormulation(formulationId) : null;
    const insertParams = [
      formulationId,
      ratedAt,
      keepString(dto.ratedBy, existing?.ratedBy),
      keepNumber(dto.feelScore, existing?.feelScore),
      keepNumber(dto.soundScore, existing?.soundScore),
      keepNumber(dto.perceivedSpeedScore, existing?.perceivedSpeedScore),
      keepNumber(dto.perceivedDurabilityScore, existing?.perceivedDurabilityScore),
      keepString(dto.playerFeedback, existing?.playerFeedback),
    ];
    const updateParams = insertParams.slice(1);
    const r = latestId
      ? await pool.query(
          `UPDATE subjective_ratings
           SET rated_at = COALESCE($1, rated_at),
               rated_by = $2,
               feel_score = $3,
               sound_score = $4,
               perceived_speed_score = $5,
               perceived_durability_score = $6,
               notes = $7
           WHERE id = $8
           RETURNING *`,
          [...updateParams, latestId]
        )
      : await pool.query(
          `INSERT INTO subjective_ratings (formulation_id, rated_at, rated_by, feel_score, sound_score,
            perceived_speed_score, perceived_durability_score, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING *`,
          insertParams
        );
    return toSubjective(r.rows[0] as Record<string, unknown>);
  }
}
