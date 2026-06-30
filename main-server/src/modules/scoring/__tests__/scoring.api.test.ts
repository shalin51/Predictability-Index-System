import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { applyMigrations, applySeeds, createDatabaseClient, resetDatabase } from '../../../database/migration-runner';
import { closePool } from '../../../infrastructure/database/pg-pool';

const FORMULATION_ID = 'd0000001-0000-0000-0000-000000000001';
const BENCHMARK_ID = 'a0000001-0000-0000-0000-000000000001';

describe('scoring API contracts', () => {
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

  it('scores a formulation against one benchmark', async () => {
    const response = await request(createApp())
      .post(`/formulations/${FORMULATION_ID}/score`)
      .send({ benchmarkId: BENCHMARK_ID });

    expect(response.status).toBe(200);
    expect(response.body.formulationId).toBe(FORMULATION_ID);
    expect(response.body.benchmarkId).toBe(BENCHMARK_ID);
    expect(response.body.scoreBand).toBeTypeOf('string');
    expect(response.body.durabilityPassProbability).toBeTypeOf('number');
    expect(response.body.metricScores.length).toBeGreaterThan(10);
  });

  it('scores a formulation against all benchmarks deterministically', async () => {
    const r1 = await request(createApp()).get(`/formulations/${FORMULATION_ID}/score/all`);
    const r2 = await request(createApp()).get(`/formulations/${FORMULATION_ID}/score/all`);

    expect(r1.status).toBe(200);
    expect(r1.body.length).toBeGreaterThanOrEqual(2);
    expect(r1.body.map((item: { benchmarkId: string; overallScore: number }) => ({
      benchmarkId: item.benchmarkId,
      overallScore: item.overallScore,
    }))).toEqual(
      r2.body.map((item: { benchmarkId: string; overallScore: number }) => ({
        benchmarkId: item.benchmarkId,
        overallScore: item.overallScore,
      }))
    );
  });

  it('returns an aggregate predictability summary', async () => {
    const response = await request(createApp()).get(`/formulations/${FORMULATION_ID}/score/summary`);

    expect(response.status).toBe(200);
    expect(response.body.formulationId).toBe(FORMULATION_ID);
    expect(response.body.overallPredictabilityScore).toBeTypeOf('number');
    expect(response.body.lifetimeSimilarity).toBeTypeOf('number');
    expect(response.body.franklinX40Similarity).toBeTypeOf('number');
    expect(response.body.durabilityPassProbability).toBeTypeOf('number');
    expect(response.body.benchmarkScores.length).toBeGreaterThanOrEqual(2);
  });
});
