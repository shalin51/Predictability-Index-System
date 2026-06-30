import type { PredictabilitySummary, ScoreResult, ScoreRequestDto } from '@amfpi/shared';
import { computeScore } from './scoring-engine';
import { buildPredictabilitySummary } from './scoring-summary';
import { FormulationRepository } from '../../infrastructure/repositories/formulation.repository';
import { BenchmarkRepository } from '../../infrastructure/repositories/benchmark.repository';
import { TestResultRepository } from '../../infrastructure/repositories/test-result.repository';
import { NotFoundError } from '../../errors/app-error';

export class ScoringService {
  constructor(
    private readonly formRepo: FormulationRepository,
    private readonly benchRepo: BenchmarkRepository,
    private readonly testRepo: TestResultRepository
  ) {}

  async score(dto: ScoreRequestDto): Promise<ScoreResult> {
    const [formulation, benchmark, metrics] = await Promise.all([
      this.formRepo.findById(dto.formulationId),
      this.benchRepo.findById(dto.benchmarkId),
      this.benchRepo.findMetricsByBenchmarkId(dto.benchmarkId),
    ]);

    if (!formulation) throw new NotFoundError(`Formulation ${dto.formulationId}`);
    if (!benchmark) throw new NotFoundError(`Benchmark ${dto.benchmarkId}`);

    const [physical, durability, environmental, subjective] = await Promise.all([
      this.testRepo.findTestResultByFormulation(dto.formulationId),
      this.testRepo.findDurabilityByFormulation(dto.formulationId),
      this.testRepo.findEnvByFormulation(dto.formulationId),
      this.testRepo.findSubjectiveByFormulation(dto.formulationId),
    ]);

    return computeScore(
      dto.formulationId,
      { id: benchmark.id, name: benchmark.name, metrics },
      { physical, durability, environmental, subjective }
    );
  }

  async scoreAgainstAll(formulationId: string): Promise<ScoreResult[]> {
    const benchmarks = await this.benchRepo.findAll();
    const results = await Promise.all(
      benchmarks.map((b) => this.score({ formulationId, benchmarkId: b.id }))
    );
    return results;
  }

  async summarize(formulationId: string): Promise<PredictabilitySummary> {
    const results = await this.scoreAgainstAll(formulationId);
    return buildPredictabilitySummary(formulationId, results);
  }
}
