import { ConflictError, NotFoundError } from '../../../errors/app-error';
import type { AuditService } from '../../audit/audit.service';
import type { ReportRepository } from '../repositories/report.repository';
import type { ReportListQuery, ReportRecord, ReportSnapshot } from '../report.types';
import { normalizeUserId, validateReportId, validateRunId } from '../validators/report.validator';

export class ReportService {
  constructor(
    private readonly repo: ReportRepository,
    private readonly auditService: AuditService
  ) {}

  async list(query: ReportListQuery): Promise<ReportRecord[]> {
    return this.repo.list(query);
  }

  async detail(reportId: string): Promise<ReportRecord> {
    validateReportId(reportId);
    const report = await this.repo.findById(reportId);
    if (!report) throw new NotFoundError(`Report ${reportId}`);
    return report;
  }

  async latestForRun(runId: string): Promise<ReportRecord> {
    validateRunId(runId);
    const report = await this.repo.latestForRun(runId);
    if (!report) throw new NotFoundError(`Report for production run ${runId}`);
    return report;
  }

  async generate(runId: string, changedBy: string): Promise<ReportRecord> {
    return this.generateInternal(runId, changedBy, false);
  }

  async regenerate(runId: string, changedBy: string): Promise<ReportRecord> {
    return this.generateInternal(runId, changedBy, true);
  }

  private async generateInternal(runId: string, changedBy: string, regenerate: boolean): Promise<ReportRecord> {
    validateRunId(runId);
    const run = await this.repo.runContext(runId);
    if (!run) throw new NotFoundError(`Production Run ${runId}`);

    const scoreReports = await this.repo.scoreReports(runId);
    if (scoreReports.length === 0) {
      throw new ConflictError('Report can only be generated after benchmark scoring exists');
    }

    const bestMatch = scoreReports.find((report) => report['isBestMatch']) ?? scoreReports[0];
    const snapshot = await this.buildSnapshot(run, scoreReports, bestMatch);
    const report = await this.repo.saveSnapshot({
      generatedBy: normalizeUserId(changedBy),
      primaryScoreReportId: bestMatch?.id ?? null,
      productionRunId: runId,
      reportName: `${String(run['runCode'])} Score Report`,
      snapshot,
    });

    await this.auditService.log({
      tableName: 'generated_reports',
      recordId: String(report.id),
      action: regenerate ? 'UPDATE' : 'INSERT',
      changedBy,
      newValues: {
        productionRunId: runId,
        primaryScoreReportId: bestMatch?.id ?? null,
        reportName: report['reportName'],
      },
    });

    return report;
  }

  private async buildSnapshot(run: ReportRecord, scoreReports: ReportRecord[], bestMatch: ReportRecord | undefined): Promise<ReportSnapshot> {
    const recipe = await this.repo.formulationRecipe(String(run['formulationId']));
    const summaries = await this.repo.runSummaries(String(run.id));
    const labResults = await this.repo.labResults(String(run.id));
    const metrics = ((bestMatch?.['metrics'] as ReportRecord[] | undefined) ?? []).map((metric) => ({
      ...metric,
      range: this.formatRange(metric),
      risk: metric['riskLevel'] ?? 'none',
    }));
    const risks = this.keyRisks(scoreReports, metrics);
    const benchmarkComparison = scoreReports.map((report) => ({
      benchmarkCode: report['benchmarkCode'],
      benchmarkName: report['benchmarkName'],
      predictabilityIndex: report['predictabilityIndex'],
      productionReadinessScore: report['productionReadinessScore'],
      similarityScore: report['overallSimilarityScore'],
      status: report['trafficLight'],
    }));

    const franklin = scoreReports.find((report) => report['benchmarkCode'] === 'X40');
    const lifetime = scoreReports.find((report) => report['benchmarkCode'] === 'LIFETIME');

    return {
      benchmarkComparison,
      executiveSummary: {
        bestMatch: bestMatch?.['benchmarkName'] ?? '-',
        formulation: run['formulation'],
        franklinX40Similarity: franklin?.['overallSimilarityScore'] ?? null,
        lifetimeSimilarity: lifetime?.['overallSimilarityScore'] ?? null,
        mainRisk: risks[0] ?? 'No key risks detected',
        predictabilityIndex: bestMatch?.['predictabilityIndex'] ?? null,
        productionReadiness: bestMatch?.['productionReadinessScore'] ?? null,
        productionRun: run['runCode'],
        trafficLight: bestMatch?.['trafficLight'] ?? 'gray',
      },
      formulationRecipe: recipe,
      historicalComparison: [],
      keyRisks: risks,
      labTestResults: labResults.length > 0 ? labResults : summaries,
      manufacturingParameters: {
        coolingTime: this.withUnit(run['coolingTime'], run['coolingTimeUnit']),
        cureHours: run['cureHoursBeforeTest'],
        cycleTime: this.withUnit(run['cycleTime'], run['cycleTimeUnit']),
        injectionPressure: this.withUnit(run['injectionPressure'], run['injectionPressureUnit']),
        machine: run['machine'],
        meltTemperature: this.withUnit(run['meltTemperature'], run['meltTemperatureUnit']),
        mold: run['mold'],
      },
      metricBreakdown: metrics,
      recommendations: this.recommendations(bestMatch),
      recommendationsPlaceholder: 'Recommended formulation adjustments will be generated after report review.',
      scoreReports,
      trendAnalysis: [],
    };
  }

  private keyRisks(scoreReports: ReportRecord[], metrics: ReportRecord[]): string[] {
    const reportRisks = scoreReports.flatMap((report) => (report['keyRisks'] as string[] | undefined) ?? []);
    const metricRisks = metrics
      .filter((metric) => metric['riskLevel'] && metric['riskLevel'] !== 'none')
      .map((metric) => `${metric['metricName']}: ${metric['riskNote'] ?? metric['riskLevel']}`);
    return [...new Set([...reportRisks, ...metricRisks])];
  }

  private recommendations(bestMatch: ReportRecord | undefined): string[] {
    const existing = (bestMatch?.['recommendations'] as string[] | undefined) ?? [];
    return existing.length > 0 ? existing : ['Review high-risk metrics before formulation adjustment.'];
  }

  private formatRange(metric: ReportRecord): string {
    const min = metric['minAcceptable'];
    const max = metric['maxAcceptable'];
    if (min != null && max != null) return `${min} - ${max}`;
    if (min != null) return `${min}+`;
    if (max != null) return `<= ${max}`;
    return '-';
  }

  private withUnit(value: unknown, unit: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    return `${value}${unit ? ` ${unit}` : ''}`;
  }
}
