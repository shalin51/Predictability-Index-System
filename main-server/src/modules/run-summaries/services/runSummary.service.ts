import { ConflictError, NotFoundError } from '../../../errors/app-error';
import type { AuditService } from '../../audit/audit.service';
import type { RunSummaryRepository } from '../repositories/runSummary.repository';
import type { MissingRequiredMetricRecord, RunSummaryRecord, RunSummaryStatus } from '../runSummary.types';
import { validateRunId } from '../validators/runSummary.validator';

export class RunSummaryService {
  constructor(
    private readonly repo: RunSummaryRepository,
    private readonly auditService: AuditService
  ) {}

  async detail(runId: string): Promise<RunSummaryRecord> {
    validateRunId(runId);
    const run = await this.repo.run(runId);
    if (!run) throw new NotFoundError(`Production Run ${runId}`);
    const [summaries, missingRequiredMetrics, status] = await Promise.all([
      this.repo.summaries(runId),
      this.repo.missingRequiredMetrics(runId),
      this.status(runId),
    ]);
    return {
      id: runId,
      canContinueToScoring: status === 'ready_for_scoring',
      missingRequiredMetrics,
      run,
      status,
      summaries,
    };
  }

  async missingRequiredMetrics(runId: string): Promise<MissingRequiredMetricRecord[]> {
    validateRunId(runId);
    await this.requireRun(runId);
    return this.repo.missingRequiredMetrics(runId);
  }

  async generate(runId: string, changedBy: string): Promise<RunSummaryRecord> {
    return this.generateInternal(runId, changedBy, false);
  }

  async regenerate(runId: string, changedBy: string): Promise<RunSummaryRecord> {
    return this.generateInternal(runId, changedBy, true);
  }

  private async generateInternal(runId: string, changedBy: string, regenerate: boolean): Promise<RunSummaryRecord> {
    validateRunId(runId);
    const before = await this.requireRun(runId);
    if (before['labTestingStatus'] !== 'completed') throw new ConflictError('Only completed runs can generate summaries');
    const missing = await this.repo.missingRequiredMetrics(runId);
    if (missing.length > 0) throw new ConflictError('Required metrics are missing');

    const summaries = await this.repo.generate(runId);
    await this.auditService.log({
      tableName: 'run_metric_summaries',
      recordId: runId,
      action: regenerate ? 'UPDATE' : 'INSERT',
      changedBy,
      oldValues: before,
      newValues: { generatedRows: summaries.length },
    });
    return this.detail(runId);
  }

  private async status(runId: string): Promise<RunSummaryStatus> {
    const run = await this.requireRun(runId);
    const summaryCount = Number(run['summaryCount'] ?? 0);
    const missing = await this.repo.missingRequiredMetrics(runId);
    if (missing.length > 0) return 'incomplete';
    if (summaryCount === 0) return 'not_generated';
    if (await this.repo.isStale(runId)) return 'stale';
    const requiredSummaries = await this.repo.requiredSummaryCount(runId);
    const totalRequired = await this.repo.totalRequiredMetricCount();
    return requiredSummaries >= totalRequired ? 'ready_for_scoring' : 'generated';
  }

  private async requireRun(runId: string): Promise<RunSummaryRecord> {
    const run = await this.repo.run(runId);
    if (!run) throw new NotFoundError(`Production Run ${runId}`);
    return run;
  }
}
