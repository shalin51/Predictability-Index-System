import type {
  GeneratedReportDto,
  ScoreResult,
} from '@amfpi/shared';
import { ScoringService } from '../scoring/scoring.service';
import { FormulationRepository } from '../../infrastructure/repositories/formulation.repository';
import { BenchmarkRepository } from '../../infrastructure/repositories/benchmark.repository';
import { TestResultRepository } from '../../infrastructure/repositories/test-result.repository';
import { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../errors/app-error';

export interface ReportSection {
  title: string;
  content: string | Record<string, unknown> | unknown[];
}

export class ReportService {
  private readonly scoringService: ScoringService;

  constructor(
    private readonly formRepo: FormulationRepository,
    private readonly benchRepo: BenchmarkRepository,
    private readonly testRepo: TestResultRepository
  ) {
    const auditService = new AuditService();
    this.scoringService = new ScoringService(formRepo, benchRepo, testRepo);
    void auditService; // injected only for ScoringService, no direct audit on report gen
  }

  async generate(formulationId: string): Promise<GeneratedReportDto> {
    const formulation = await this.formRepo.findById(formulationId);
    if (!formulation) throw new NotFoundError(`Formulation ${formulationId}`);

    const [benchmarks, predictabilitySummary, testData] = await Promise.all([
      this.benchRepo.findAll(),
      this.scoringService.summarize(formulationId),
      this.getAllTestData(formulationId),
    ]);
    const allScores = predictabilitySummary.benchmarkScores;

    const benchmarkMap = new Map(benchmarks.map((b) => [b.id, b]));
    const bestScore = allScores[0] ?? null;

    const benchmarkResults = allScores.map((s) => {
      const bm = benchmarkMap.get(s.benchmarkId);
      return {
        benchmark: {
          id: s.benchmarkId,
          name: bm?.name ?? 'Unknown',
          ballBrand: bm?.ballBrand ?? '',
          ballModel: bm?.ballModel ?? '',
        },
        scoreResult: s,
      };
    });

    const recommendations = this.buildRecommendations(allScores);

    return {
      formulationId,
      formulationCode: formulation.formulationCode,
      formulationName: formulation.formulationCode,
      generatedAt: new Date().toISOString(),

      executiveSummary: {
        verdict: predictabilitySummary.productionReady
          ? 'This formulation meets production quality standards.'
          : predictabilitySummary.trafficLight === 'yellow'
            ? 'This formulation requires minor adjustments before production approval.'
            : 'This formulation does not meet production standards. Significant reformulation needed.',
        predictabilityScore: predictabilitySummary.overallPredictabilityScore,
        scoreBand: predictabilitySummary.scoreBand,
        lifetimeSimilarity: predictabilitySummary.lifetimeSimilarity,
        franklinX40Similarity: predictabilitySummary.franklinX40Similarity,
        durabilityPassProbability: predictabilitySummary.durabilityPassProbability,
        bounceComplianceProbability: predictabilitySummary.bounceComplianceProbability,
        hardnessComplianceProbability: predictabilitySummary.hardnessComplianceProbability,
        overallProductionReadiness: predictabilitySummary.overallProductionReadiness,
        trafficLight: predictabilitySummary.trafficLight,
        productionReady: predictabilitySummary.productionReady,
        topRisks: (bestScore?.keyRisks ?? predictabilitySummary.keyRisks).slice(0, 5),
      },

      predictabilitySummary,
      formulation,
      benchmarkResults,
      testData,
      recommendations,
    };
  }

  private async getAllTestData(formulationId: string) {
    const [physical, durability, environmental, subjective] = await Promise.all([
      this.testRepo.findTestResultByFormulation(formulationId),
      this.testRepo.findDurabilityByFormulation(formulationId),
      this.testRepo.findEnvByFormulation(formulationId),
      this.testRepo.findSubjectiveByFormulation(formulationId),
    ]);
    return { physical, durability, environmental, subjective };
  }

  private buildRecommendations(scores: ScoreResult[]): string[] {
    const recs: string[] = [];
    const allMissing = new Set(scores.flatMap((s) => s.benchmarkSimilarity.missingMetrics));
    const allFailures = new Set(scores.flatMap((s) => s.benchmarkSimilarity.criticalFailures));

    if (allMissing.size > 0) {
      recs.push(`Complete missing test data for: ${[...allMissing].join(', ')}`);
    }
    if (allFailures.size > 0) {
      recs.push(`Address critical metric failures: ${[...allFailures].join(', ')}`);
    }

    // Common out-of-range metrics across benchmarks
    const outOfRange = scores
      .flatMap((s) => s.metricScores)
      .filter((m) => !m.withinRange && !m.isMissing)
      .reduce((acc, m) => {
        acc[m.metricName] = (acc[m.metricName] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    Object.entries(outOfRange)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .forEach(([metric]) => {
        recs.push(`Adjust ${metric.replace(/_/g, ' ')} to fall within acceptable benchmark ranges`);
      });

    if (recs.length === 0) {
      recs.push('All critical metrics are within acceptable ranges. Consider fine-tuning towards target values to improve the Predictability Index score.');
    }

    return recs;
  }
}
