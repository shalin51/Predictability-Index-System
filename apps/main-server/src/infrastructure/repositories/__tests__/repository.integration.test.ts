import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations, applySeeds, createDatabaseClient, resetDatabase } from '../../../database/migration-runner';
import { closePool } from '../../database/pg-pool';
import { BenchmarkRepository } from '../benchmark.repository';
import { FormulationRepository } from '../formulation.repository';
import { TestResultRepository } from '../test-result.repository';

const FORMULATION_ID = 'd0000001-0000-0000-0000-000000000001';
const LIFETIME_BENCHMARK_ID = 'a0000001-0000-0000-0000-000000000001';

describe('repository integration', () => {
  beforeAll(async () => {
    await closePool();

    const client = createDatabaseClient();
    await client.connect();

    try {
      await resetDatabase(client);
      await applyMigrations(client);
      await applySeeds(client);
    } finally {
      await client.end();
    }
  }, 60_000);

  afterAll(async () => {
    await closePool();
  });

  it('lists formulations through mapped DTOs', async () => {
    const repo = new FormulationRepository();
    const result = await repo.findAll(10, 0);

    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.data[0]).toHaveProperty('formulationCode');
    expect(result.data[0]).not.toHaveProperty('formulation_code');
  });

  it('loads formulation detail with composition', async () => {
    const repo = new FormulationRepository();
    const formulation = await repo.findById(FORMULATION_ID);

    expect(formulation?.id).toBe(FORMULATION_ID);
    expect(formulation?.materials?.length).toBeGreaterThan(0);
    expect(formulation?.materials?.[0]).toHaveProperty('materialName');
  });

  it('lists seeded benchmark profiles', async () => {
    const repo = new BenchmarkRepository();
    const benchmarks = await repo.findAll();

    expect(benchmarks.map((benchmark) => benchmark.name)).toEqual(
      expect.arrayContaining(['Lifetime Outdoor', 'Franklin X-40'])
    );
  });

  it('loads benchmark metrics with benchmark linkage', async () => {
    const repo = new BenchmarkRepository();
    const metrics = await repo.findMetricsByBenchmarkId(LIFETIME_BENCHMARK_ID);

    expect(metrics.length).toBeGreaterThan(10);
    expect(metrics.every((metric) => metric.benchmarkId === LIFETIME_BENCHMARK_ID)).toBe(true);
  });

  it('loads seeded test result data by formulation', async () => {
    const repo = new TestResultRepository();
    const result = await repo.findTestResultByFormulation(FORMULATION_ID);

    expect(result?.weightG).toBe(26.1);
    expect(result?.bounceCm).toBe(67.5);
    expect(result?.coefficientOfRestitution).toBe(0.81);
  });
});
