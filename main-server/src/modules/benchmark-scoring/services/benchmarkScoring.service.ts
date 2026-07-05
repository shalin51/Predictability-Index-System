import { ConflictError, NotFoundError } from '../../../errors/app-error';
import type { AuditService } from '../../audit/audit.service';
import type { BenchmarkScoringRepository } from '../repositories/benchmarkScoring.repository';
import type { PerformanceDistanceService } from './performanceDistance.service';
import type { BenchmarkScoreResult, BenchmarkScoringRecord } from '../benchmarkScoring.types';
import { validateReportId, validateRunId } from '../validators/benchmarkScoring.validator';

export class BenchmarkScoringService {
  constructor(
    private readonly repo: BenchmarkScoringRepository,
    private readonly scoringService: PerformanceDistanceService,
    private readonly auditService: AuditService
  ) {}

  async runScores(runId: string): Promise<BenchmarkScoringRecord> {
    validateRunId(runId);
    const run = await this.requireRun(runId);
    const reports = await this.repo.reportsForRun(runId);
    return {
      id: runId,
      bestMatch: reports.find((report) => report['isBestMatch']) ?? null,
      reports,
      run,
      scoringReady: await this.scoringReady(runId),
    };
  }

  async report(scoreReportId: string): Promise<BenchmarkScoringRecord> {
    validateReportId(scoreReportId);
    const report = await this.repo.reportDetail(scoreReportId);
    if (!report) throw new NotFoundError(`Score Report ${scoreReportId}`);
    return report;
  }

  async compare(runId: string): Promise<BenchmarkScoreResult[]> {
    validateRunId(runId);
    await this.assertScoringReady(runId);
    return this.calculate(runId);
  }

  async generate(runId: string, changedBy: string): Promise<BenchmarkScoringRecord> {
    return this.generateInternal(runId, changedBy, false);
  }

  async regenerate(runId: string, changedBy: string): Promise<BenchmarkScoringRecord> {
    return this.generateInternal(runId, changedBy, true);
  }

  private async generateInternal(runId: string, changedBy: string, regenerate: boolean): Promise<BenchmarkScoringRecord> {
    const before = await this.runScores(runId);
    const algorithm = await this.repo.algorithmVersion();
    if (!algorithm) throw new NotFoundError('PERFORMANCE_DISTANCE v1.0');
    const scores = await this.compare(runId);
    const reports = await this.repo.saveReports(runId, algorithm.id, scores);
    await this.auditService.log({
      tableName: 'score_reports',
      recordId: runId,
      action: regenerate ? 'UPDATE' : 'INSERT',
      changedBy,
      oldValues: before,
      newValues: { generatedReports: reports.length, algorithmVersionId: algorithm.id },
    });
    return this.runScores(runId);
  }

  private async calculate(runId: string): Promise<BenchmarkScoreResult[]> {
    const algorithm = await this.repo.algorithmVersion();
    if (!algorithm) throw new NotFoundError('PERFORMANCE_DISTANCE v1.0');
    const benchmarks = await this.repo.benchmarks();
    const scores: BenchmarkScoreResult[] = [];
    for (const benchmark of benchmarks) {
      const inputs = await this.repo.scoringInputs(runId, benchmark.id);
      scores.push(this.scoringService.scoreBenchmark(
        {
          benchmarkCode: String(benchmark['benchmarkCode']),
          benchmarkId: benchmark.id,
          benchmarkName: String(benchmark['benchmarkName']),
        },
        inputs,
        algorithm['config']
      ));
    }
    return scores;
  }

  private async assertScoringReady(runId: string): Promise<void> {
    const run = await this.requireRun(runId);
    if (run['status'] !== 'completed' && run['status'] !== 'scored') {
      throw new ConflictError('Only completed summarized runs can be scored');
    }
    const missing = await this.repo.missingRequiredSummaries(runId);
    if (missing.length > 0) throw new ConflictError('Required run metric summaries are missing');
    if (await this.repo.summaryIsStale(runId)) throw new ConflictError('Run metric summaries are stale');
  }

  private async scoringReady(runId: string): Promise<boolean> {
    try {
      await this.assertScoringReady(runId);
      return true;
    } catch {
      return false;
    }
  }

  private async requireRun(runId: string): Promise<BenchmarkScoringRecord> {
    const run = await this.repo.run(runId);
    if (!run) throw new NotFoundError(`Production Run ${runId}`);
    return run;
  }
}
