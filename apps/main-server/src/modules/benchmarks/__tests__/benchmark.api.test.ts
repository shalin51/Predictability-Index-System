import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { applyMigrations, applySeeds, createDatabaseClient, resetDatabase } from '../../../database/migration-runner';
import { closePool } from '../../../infrastructure/database/pg-pool';

const BENCHMARK_ID = 'a0000001-0000-0000-0000-000000000001';

describe('benchmark API contracts', () => {
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

  it('lists seeded benchmark profiles', async () => {
    const response = await request(createApp()).get('/benchmarks');

    expect(response.status).toBe(200);
    expect(response.body.map((item: { name: string }) => item.name)).toEqual(
      expect.arrayContaining(['Lifetime Outdoor', 'Franklin X-40'])
    );
  });

  it('loads a benchmark detail with metrics', async () => {
    const response = await request(createApp()).get(`/benchmarks/${BENCHMARK_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(BENCHMARK_ID);
    expect(response.body.metrics.length).toBeGreaterThan(10);
  });

  it('updates benchmark metric configuration', async () => {
    const response = await request(createApp())
      .put(`/benchmarks/${BENCHMARK_ID}/metrics/bounce`)
      .send({
        targetValue: 69,
        minAcceptable: 65,
        maxAcceptable: 73,
        standardDeviation: 2.5,
        weight: 0.95,
        criticality: 'critical',
        unit: 'cm',
        metricCategory: 'performance',
      });

    expect(response.status).toBe(200);
    expect(response.body.targetValue).toBe(69);
    expect(response.body.criticality).toBe('critical');
  });

  it('validates benchmark weights', async () => {
    const response = await request(createApp()).get(`/benchmarks/${BENCHMARK_ID}/metrics/validate-weights`);

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(response.body.totalWeight).toBeGreaterThan(0);
  });
});
