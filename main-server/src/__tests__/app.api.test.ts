import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import {
  applyMigrations,
  applySeeds,
  createDatabaseClient,
  resetDatabase,
} from '../database/migration-runner';
import { closePool } from '../infrastructure/database/pg-pool';

const FORMULATION_ID = 'd0000001-0000-0000-0000-000000000001';

describe('app assembly contracts', () => {
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

  it('returns version metadata', async () => {
    const response = await request(createApp()).get('/version');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      version: '1.0.0',
      appEnv: 'dev',
      service: 'main-server',
    });
  });

  it('returns the not found envelope for unknown routes', async () => {
    const response = await request(createApp()).get('/missing-route');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.timestamp).toBeTypeOf('string');
  });

  it('mounts all registered routers through createApp', async () => {
    const app = createApp();
    const [health, version, formulations, results, benchmarks, scoring, report, ml] = await Promise.all([
      request(app).get('/health'),
      request(app).get('/version'),
      request(app).get('/formulations?page=1&pageSize=1'),
      request(app).get(`/formulations/${FORMULATION_ID}/results`),
      request(app).get('/benchmarks'),
      request(app).get(`/formulations/${FORMULATION_ID}/score/all`),
      request(app).get(`/formulations/${FORMULATION_ID}/report`),
      request(app).get('/ml/export'),
    ]);

    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');

    expect(version.status).toBe(200);
    expect(version.body.service).toBe('main-server');

    expect(formulations.status).toBe(200);
    expect(formulations.body.data.length).toBeGreaterThan(0);

    expect(results.status).toBe(200);
    expect(results.body.physical.weightG).toBeTypeOf('number');

    expect(benchmarks.status).toBe(200);
    expect(benchmarks.body.length).toBeGreaterThan(0);

    expect(scoring.status).toBe(200);
    expect(scoring.body.length).toBeGreaterThan(0);

    expect(report.status).toBe(200);
    expect(report.body.formulationId).toBe(FORMULATION_ID);

    expect(ml.status).toBe(200);
    expect(ml.body.recordCount).toBeGreaterThan(0);
  });
});
