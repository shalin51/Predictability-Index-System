import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

describe('auth bypass contracts', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalApiKey = process.env.APP_API_KEY;

  let createApp: typeof import('../app').createApp;
  let closePool: typeof import('../infrastructure/database/pg-pool').closePool;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.APP_API_KEY = 'test-key';

    ({ createApp } = await import('../app'));
    ({ closePool } = await import('../infrastructure/database/pg-pool'));
  });

  afterAll(async () => {
    await closePool();

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalApiKey === undefined) {
      delete process.env.APP_API_KEY;
    } else {
      process.env.APP_API_KEY = originalApiKey;
    }

    vi.resetModules();
  });

  it('skips API key auth for health and version only', async () => {
    const app = createApp();
    const [health, version, benchmarks] = await Promise.all([
      request(app).get('/health'),
      request(app).get('/version'),
      request(app).get('/benchmarks'),
    ]);

    expect(health.status).toBe(200);
    expect(version.status).toBe(200);
    expect(benchmarks.status).toBe(401);
    expect(benchmarks.body.code).toBe('INVALID_API_KEY');
  });
});
