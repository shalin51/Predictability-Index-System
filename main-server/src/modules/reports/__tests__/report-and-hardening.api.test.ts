import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { applyMigrations, applySeeds, createDatabaseClient, resetDatabase } from '../../../database/migration-runner';
import { closePool, getPool } from '../../../infrastructure/database/pg-pool';

const FORMULATION_ID = 'd0000001-0000-0000-0000-000000000001';

async function waitForRequestLog(path: string): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await getPool().query(
      'SELECT COUNT(*)::int AS count FROM request_logs WHERE path = $1',
      [path]
    );
    const count = result.rows[0]?.['count'] as number;
    if (count > 0) return count;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return 0;
}

describe('report and hardening API contracts', () => {
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

  it('generates a formulation report', async () => {
    const response = await request(createApp()).get(`/formulations/${FORMULATION_ID}/report`);

    expect(response.status).toBe(200);
    expect(response.body.formulationId).toBe(FORMULATION_ID);
    expect(response.body.executiveSummary.predictabilityScore).toBeTypeOf('number');
    expect(response.body.executiveSummary.lifetimeSimilarity).toBeTypeOf('number');
    expect(response.body.executiveSummary.overallProductionReadiness).toBeTypeOf('number');
    expect(response.body.predictabilitySummary.overallPredictabilityScore).toBeTypeOf('number');
    expect(response.body.recommendations.length).toBeGreaterThan(0);
  });

  it('exports ML-ready data', async () => {
    const response = await request(createApp()).get('/ml/export');

    expect(response.status).toBe(200);
    expect(response.body.recordCount).toBeGreaterThan(0);
    expect(response.body.schema.features).toContain('weight_g');
  });

  it('enforces supported API versions and writes request logs', async () => {
    const badVersion = await request(createApp())
      .get('/benchmarks')
      .set('x-api-version', 'v2');

    expect(badVersion.status).toBe(400);
    expect(badVersion.body.code).toBe('UNSUPPORTED_API_VERSION');

    const goodRequest = await request(createApp()).get('/benchmarks');

    expect(goodRequest.status).toBe(200);
    expect(goodRequest.headers['x-api-version']).toBe('v1');

    const logCount = await waitForRequestLog('/benchmarks');
    expect(logCount).toBeGreaterThan(0);
  });
});
