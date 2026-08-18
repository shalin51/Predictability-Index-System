import { describe, expect, it } from 'vitest';
import type { ScoringMetricInput } from '../benchmarkScoring.types';
import { PerformanceDistanceService } from '../services/performanceDistance.service';

const benchmark = { benchmarkCode: 'PRO2', benchmarkId: 'pro2-id', benchmarkName: 'Pro2' };

function input(overrides: Partial<ScoringMetricInput> = {}): ScoringMetricInput {
  return {
    benchmarkName: 'Pro2',
    comparisonMode: 'max_cap',
    criticality: 'critical',
    maxAcceptable: 35.67,
    metricId: 'bounce-id',
    metricName: 'Bounce Height',
    minAcceptable: null,
    requiredForPass: true,
    runMeanValue: 35.67,
    targetMean: 35.67,
    weight: 1,
    ...overrides,
  };
}

describe('PerformanceDistanceService one-sided limits', () => {
  it('awards full credit at or below a maximum cap', () => {
    const result = new PerformanceDistanceService().scoreBenchmark(benchmark, [input({ runMeanValue: 34 })], {});

    expect(result.metrics[0]).toMatchObject({ distance: 0, metricScore: 100, riskLevel: undefined, trafficLight: 'green' });
  });

  it('fails a value above a maximum cap', () => {
    const result = new PerformanceDistanceService().scoreBenchmark(benchmark, [input({ runMeanValue: 35.671 })], {});

    expect(result.metrics[0]).toMatchObject({ metricScore: 0, riskLevel: 'critical', trafficLight: 'red' });
    expect(result.metrics[0]?.riskNote).toContain('maximum allowed');
  });

  it('supports a minimum floor without requiring a maximum', () => {
    const result = new PerformanceDistanceService().scoreBenchmark(benchmark, [input({
      comparisonMode: 'min_floor',
      maxAcceptable: null,
      minAcceptable: 10,
      runMeanValue: 10,
    })], {});

    expect(result.metrics[0]).toMatchObject({ distance: 0, metricScore: 100, trafficLight: 'green' });
  });
});
