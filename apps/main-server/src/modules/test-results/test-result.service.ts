import type {
  TestResult, DurabilityResult, EnvironmentalResult, SubjectiveRating,
  UpsertTestResultDto, UpsertDurabilityDto, UpsertEnvironmentalDto, UpsertSubjectiveRatingDto, FormulationResultsBundle,
} from '@amfpi/shared';
import { TestResultRepository } from '../../infrastructure/repositories/test-result.repository';
import { FormulationRepository } from '../../infrastructure/repositories/formulation.repository';
import { AuditService } from '../audit/audit.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';

export class TestResultService {
  constructor(
    private readonly repo: TestResultRepository,
    private readonly formRepo: FormulationRepository,
    private readonly audit: AuditService
  ) {}

  private async assertFormulationExists(id: string): Promise<void> {
    const f = await this.formRepo.findById(id);
    if (!f) throw new NotFoundError(`Formulation ${id}`);
  }

  // ── Physical/Performance ───────────────────────────────

  async getTestResult(formulationId: string): Promise<TestResult | null> {
    await this.assertFormulationExists(formulationId);
    return this.repo.findTestResultByFormulation(formulationId);
  }

  async upsertTestResult(formulationId: string, dto: UpsertTestResultDto, changedBy: string): Promise<TestResult> {
    await this.assertFormulationExists(formulationId);
    this.validateTestResultDto(dto);
    const existing = await this.repo.findTestResultByFormulation(formulationId);
    const result = await this.repo.upsertTestResult(formulationId, dto);
    await this.audit.log({
      tableName: 'test_results',
      recordId: result.id,
      action: existing ? 'UPDATE' : 'INSERT',
      changedBy,
      oldValues: existing as unknown as Record<string, unknown> | undefined,
      newValues: result as unknown as Record<string, unknown>,
    });
    return result;
  }

  // ── Durability ─────────────────────────────────────────

  async getDurability(formulationId: string): Promise<DurabilityResult | null> {
    await this.assertFormulationExists(formulationId);
    return this.repo.findDurabilityByFormulation(formulationId);
  }

  async upsertDurability(formulationId: string, dto: UpsertDurabilityDto, changedBy: string): Promise<DurabilityResult> {
    await this.assertFormulationExists(formulationId);
    this.validateDurabilityDto(dto);
    const existing = await this.repo.findDurabilityByFormulation(formulationId);
    const result = await this.repo.upsertDurability(formulationId, dto);
    await this.audit.log({
      tableName: 'durability_results',
      recordId: result.id,
      action: existing ? 'UPDATE' : 'INSERT',
      changedBy,
      oldValues: existing as unknown as Record<string, unknown> | undefined,
      newValues: result as unknown as Record<string, unknown>,
    });
    return result;
  }

  // ── Environmental ──────────────────────────────────────

  async getEnvironmental(formulationId: string): Promise<EnvironmentalResult | null> {
    await this.assertFormulationExists(formulationId);
    return this.repo.findEnvByFormulation(formulationId);
  }

  async upsertEnvironmental(formulationId: string, dto: UpsertEnvironmentalDto, changedBy: string): Promise<EnvironmentalResult> {
    await this.assertFormulationExists(formulationId);
    this.validateEnvironmentalDto(dto);
    const existing = await this.repo.findEnvByFormulation(formulationId);
    const result = await this.repo.upsertEnvironmental(formulationId, dto);
    await this.audit.log({
      tableName: 'environmental_results',
      recordId: result.id,
      action: existing ? 'UPDATE' : 'INSERT',
      changedBy,
      oldValues: existing as unknown as Record<string, unknown> | undefined,
      newValues: result as unknown as Record<string, unknown>,
    });
    return result;
  }

  // ── Subjective ─────────────────────────────────────────

  async getSubjective(formulationId: string): Promise<SubjectiveRating | null> {
    await this.assertFormulationExists(formulationId);
    return this.repo.findSubjectiveByFormulation(formulationId);
  }

  async upsertSubjective(formulationId: string, dto: UpsertSubjectiveRatingDto, changedBy: string): Promise<SubjectiveRating> {
    await this.assertFormulationExists(formulationId);
    this.validateSubjectiveDto(dto);
    const existing = await this.repo.findSubjectiveByFormulation(formulationId);
    const result = await this.repo.upsertSubjective(formulationId, dto);
    await this.audit.log({
      tableName: 'subjective_ratings',
      recordId: result.id,
      action: existing ? 'UPDATE' : 'INSERT',
      changedBy,
      oldValues: existing as unknown as Record<string, unknown> | undefined,
      newValues: result as unknown as Record<string, unknown>,
    });
    return result;
  }

  // ── Combined result summary ────────────────────────────

  async getAllResults(formulationId: string): Promise<FormulationResultsBundle> {
    await this.assertFormulationExists(formulationId);
    const [physical, durability, environmental, subjective] = await Promise.all([
      this.repo.findTestResultByFormulation(formulationId),
      this.repo.findDurabilityByFormulation(formulationId),
      this.repo.findEnvByFormulation(formulationId),
      this.repo.findSubjectiveByFormulation(formulationId),
    ]);
    return { physical, durability, environmental, subjective };
  }

  // ── Validation ─────────────────────────────────────────

  private validateTestResultDto(dto: UpsertTestResultDto): void {
    const requiredKeys: Array<keyof UpsertTestResultDto> = [
      'weightG', 'diameterMm', 'wallThicknessMm', 'roundnessMm', 'balanceG',
      'bounceCm', 'hardnessShorD', 'compressionKg', 'deflectionMm', 'coefficientOfRestitution',
    ];
    this.assertRequiredMetrics(dto, requiredKeys, 'physical/performance');

    if (dto.coefficientOfRestitution !== undefined) {
      if (dto.coefficientOfRestitution < 0 || dto.coefficientOfRestitution > 1) {
        throw new ValidationError('coefficientOfRestitution must be between 0 and 1');
      }
    }
    if (dto.hardnessShorD !== undefined && dto.hardnessShorD < 0) {
      throw new ValidationError('hardnessShorD must be non-negative');
    }
  }

  private validateDurabilityDto(dto: UpsertDurabilityDto): void {
    this.assertRequiredMetrics(
      dto,
      ['airCannonCycles', 'crackInitiationCycles', 'crackPropagationMm', 'deformationMm'],
      'durability'
    );

    if (dto.airCannonCycles !== undefined && dto.airCannonCycles < 0) {
      throw new ValidationError('airCannonCycles must be non-negative');
    }
  }

  private validateEnvironmentalDto(dto: UpsertEnvironmentalDto): void {
    this.assertRequiredMetrics(
      dto,
      ['hotPerformanceScore', 'coldPerformanceScore', 'humidityPerformanceScore'],
      'environmental'
    );

    const scoreFields = [
      dto.hotPerformanceScore,
      dto.coldPerformanceScore,
      dto.humidityPerformanceScore,
    ];

    for (const score of scoreFields) {
      if (score !== undefined && (score < 0 || score > 100)) {
        throw new ValidationError('Environmental performance scores must be between 0 and 100');
      }
    }
  }

  private validateSubjectiveDto(dto: UpsertSubjectiveRatingDto): void {
    this.assertRequiredMetrics(
      dto,
      ['feelScore', 'soundScore', 'perceivedSpeedScore', 'perceivedDurabilityScore'],
      'subjective'
    );

    const scores = [dto.feelScore, dto.soundScore, dto.perceivedSpeedScore, dto.perceivedDurabilityScore];
    for (const score of scores) {
      if (score !== undefined && (score < 1 || score > 10)) {
        throw new ValidationError('Subjective scores must be between 1 and 10');
      }
    }
  }

  private assertRequiredMetrics<T extends object>(
    dto: T,
    keys: Array<keyof T>,
    label: string
  ): void {
    const missing = keys.filter((key) => dto[key] === undefined || dto[key] === null);
    if (missing.length > 0) {
      throw new ValidationError(`Missing required ${label} metrics: ${missing.join(', ')}`);
    }
  }
}
