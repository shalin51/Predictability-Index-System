import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { applyMigrations, applySeeds, createDatabaseClient, resetDatabase } from '../../../database/migration-runner';
import { closePool, getPool } from '../../../infrastructure/database/pg-pool';

const FORMULATION_ID = 'd0000001-0000-0000-0000-000000000001';

describe('test results API contracts', () => {
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

  it('loads combined results', async () => {
    const response = await request(createApp()).get(`/formulations/${FORMULATION_ID}/results`);

    expect(response.status).toBe(200);
    expect(response.body.physical.weightG).toBe(26.1);
    expect(response.body.durability.airCannonCycles).toBe(1950);
  });

  it('updates physical results in place', async () => {
    const before = await getPool().query('SELECT COUNT(*)::int AS count FROM test_results WHERE formulation_id = $1', [FORMULATION_ID]);

    const response = await request(createApp())
      .post(`/formulations/${FORMULATION_ID}/results/physical`)
      .set('x-user-id', 'lab-user')
      .send({
        weightG: 26.4,
        diameterMm: 74.2,
        wallThicknessMm: 2.6,
        roundnessMm: 0.25,
        balanceG: 0.42,
        bounceCm: 69.2,
        hardnessShorD: 48.5,
        compressionKg: 42.5,
        deflectionMm: 4.8,
        coefficientOfRestitution: 0.84,
      });

    const after = await getPool().query('SELECT COUNT(*)::int AS count FROM test_results WHERE formulation_id = $1', [FORMULATION_ID]);
    const audit = await getPool().query(
      `SELECT action FROM audit_log WHERE table_name = 'test_results' AND record_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [response.body.id]
    );

    expect(response.status).toBe(201);
    expect(response.body.weightG).toBe(26.4);
    expect(before.rows[0]?.['count']).toBe(after.rows[0]?.['count']);
    expect(audit.rows[0]?.['action']).toBe('UPDATE');
  });

  it('preserves existing performance values when only physical properties are updated', async () => {
    const response = await request(createApp())
      .post(`/formulations/${FORMULATION_ID}/results/physical`)
      .send({
        weightG: 26.1,
        diameterMm: 74.1,
        wallThicknessMm: 2.55,
        roundnessMm: 0.23,
        balanceG: 0.39,
      });

    expect(response.status).toBe(201);
    expect(response.body.weightG).toBe(26.1);
    expect(response.body.bounceCm).toBeTypeOf('number');
    expect(response.body.hardnessShorD).toBeTypeOf('number');
  });
});
