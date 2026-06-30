import { describe, it, expect } from 'vitest';
import { computeScore } from '../scoring-engine';
import type { BenchmarkMetricTarget, TestResult } from '@amfpi/shared';

const makeBenchmark = (overrides?: Partial<BenchmarkMetricTarget>): BenchmarkMetricTarget => ({
  id: 'b1',
  benchmarkId: 'bench1',
  metricName: 'bounce',
  metricCategory: 'performance',
  targetValue: 70,
  minAcceptable: 65,
  maxAcceptable: 75,
  standardDeviation: 2,
  weight: 1.0,
  criticality: 'high',
  unit: 'cm',
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const basePhysical: TestResult = {
  id: 'r1', formulationId: 'f1', testedAt: '', createdAt: '', updatedAt: '',
  bounceCm: 70,
};

describe('computeScore()', () => {
  it('returns perfect score when value exactly matches target', () => {
    const result = computeScore('f1',
      { id: 'bench1', name: 'Test Bench', metrics: [makeBenchmark()] },
      { physical: { ...basePhysical, bounceCm: 70 } }
    );
    expect(result.overallScore).toBe(100);
    expect(result.scoreBand).toBe('extremely_likely');
    expect(result.trafficLight).toBe('green');
    expect(result.productionReady).toBe(true);
    expect(result.bounceComplianceProbability).toBe(100);
  });

  it('is deterministic — same input always same output', () => {
    const input = {
      id: 'bench1', name: 'Test Bench',
      metrics: [makeBenchmark(), makeBenchmark({ metricName: 'hardness', targetValue: 50, standardDeviation: 2 })],
    };
    const r1 = computeScore('f1', input, { physical: { ...basePhysical, bounceCm: 68, hardnessShorD: 49 } });
    const r2 = computeScore('f1', input, { physical: { ...basePhysical, bounceCm: 68, hardnessShorD: 49 } });
    expect(r1.overallScore).toBe(r2.overallScore);
  });

  it('flags missing metric as yellow/red and penalises score', () => {
    const result = computeScore('f1',
      { id: 'bench1', name: 'Test Bench', metrics: [makeBenchmark()] },
      { physical: { ...basePhysical, bounceCm: undefined } }
    );
    expect(result.metricScores[0]!.isMissing).toBe(true);
    expect(result.overallScore).toBeLessThan(40); // heavy penalty for missing data
    expect(result.bounceComplianceProbability).toBe(10);
  });

  it('returns red trafficLight when critical metric is out of range', () => {
    const result = computeScore('f1',
      { id: 'bench1', name: 'Test Bench', metrics: [makeBenchmark({ criticality: 'critical' })] },
      { physical: { ...basePhysical, bounceCm: 10 } }  // way out of range
    );
    expect(result.trafficLight).toBe('red');
    expect(result.productionReady).toBe(false);
    expect(result.keyRisks.length).toBeGreaterThan(0);
  });

  it('score is green when all metrics within acceptable range', () => {
    const result = computeScore('f1',
      { id: 'bench1', name: 'Test Bench', metrics: [makeBenchmark()] },
      { physical: { ...basePhysical, bounceCm: 72 } }  // within 65–75
    );
    expect(result.trafficLight).toBe('green');
  });

  it('score decreases as value moves further from target', () => {
    const bench = { id: 'b', name: 'B', metrics: [makeBenchmark()] };
    const r1 = computeScore('f1', bench, { physical: { ...basePhysical, bounceCm: 70 } });
    const r2 = computeScore('f1', bench, { physical: { ...basePhysical, bounceCm: 65 } });
    const r3 = computeScore('f1', bench, { physical: { ...basePhysical, bounceCm: 40 } });
    expect(r1.overallScore).toBeGreaterThan(r2.overallScore);
    expect(r2.overallScore).toBeGreaterThan(r3.overallScore);
  });

  it('metric-level details are visible in result', () => {
    const result = computeScore('f1',
      { id: 'bench1', name: 'Test Bench', metrics: [makeBenchmark()] },
      { physical: { ...basePhysical, bounceCm: 70 } }
    );
    expect(result.metricScores[0]!.metricName).toBe('bounce');
    expect(result.metricScores[0]!.rawValue).toBe(70);
    expect(result.metricScores[0]!.targetValue).toBe(70);
    expect(result.overallProductionReadiness).toBeGreaterThan(0);
  });
});
