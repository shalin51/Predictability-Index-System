import { config } from '../src/config/env';
import { closePool, getPool } from '../src/infrastructure/database/pg-pool';
import { AuditService } from '../src/modules/audit/audit.service';
import { BenchmarkScoringRepository } from '../src/modules/benchmark-scoring/repositories/benchmarkScoring.repository';
import { BenchmarkScoringService } from '../src/modules/benchmark-scoring/services/benchmarkScoring.service';
import { PerformanceDistanceService } from '../src/modules/benchmark-scoring/services/performanceDistance.service';
import { RunSummaryRepository } from '../src/modules/run-summaries/repositories/runSummary.repository';
import { RunSummaryService } from '../src/modules/run-summaries/services/runSummary.service';

interface RunRow {
  id: string;
  runCode: string;
}

async function scoreAllCompletedRuns(): Promise<void> {
  if (config.appEnv !== 'dev') throw new Error('This batch runner is restricted to APP_ENV=dev');

  const audit = new AuditService();
  const summaries = new RunSummaryService(new RunSummaryRepository(), audit);
  const scoring = new BenchmarkScoringService(
    new BenchmarkScoringRepository(),
    new PerformanceDistanceService(),
    audit
  );
  const result = await getPool().query<RunRow>(
    `SELECT id, run_code AS "runCode"
     FROM production_runs
     WHERE status IN ('completed', 'scored')
     ORDER BY run_code`
  );

  let reportCount = 0;
  for (const run of result.rows) {
    const existingSummary = await summaries.detail(run.id);
    if (existingSummary.summaries.length > 0) {
      await summaries.regenerate(run.id, 'codex-dev-benchmark-batch');
    } else {
      await summaries.generate(run.id, 'codex-dev-benchmark-batch');
    }

    const existingScores = await scoring.runScores(run.id);
    const scored = existingScores.reports.length > 0
      ? await scoring.regenerate(run.id, 'codex-dev-benchmark-batch')
      : await scoring.generate(run.id, 'codex-dev-benchmark-batch');
    reportCount += Array.isArray(scored.reports) ? scored.reports.length : 0;
  }

  console.log(JSON.stringify({ productionRunsScored: result.rowCount, scoreReportsGenerated: reportCount }));
}

scoreAllCompletedRuns()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => closePool());
