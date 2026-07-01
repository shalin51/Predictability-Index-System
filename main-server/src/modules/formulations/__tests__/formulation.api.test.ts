import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { applyMigrations, applySeeds, createDatabaseClient, resetDatabase } from '../../../database/migration-runner';
import { closePool, getPool } from '../../../infrastructure/database/pg-pool';

const EXISTING_FORMULATION_ID = 'd0000001-0000-0000-0000-000000000001';

describe('formulation API contracts', () => {
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

  it('lists formulations with paginated response metadata', async () => {
    const response = await request(createApp()).get('/formulations?page=1&pageSize=10');

    expect(response.status).toBe(200);
    expect(response.body.total).toBeGreaterThanOrEqual(2);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(10);
    expect(response.body.timestamp).toBeTypeOf('string');
    expect(response.body.data[0]).toHaveProperty('formulationCode');
  });

  it('loads formulation detail with composition', async () => {
    const response = await request(createApp()).get(`/formulations/${EXISTING_FORMULATION_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(EXISTING_FORMULATION_ID);
    expect(response.body.resinComponents.length).toBeGreaterThan(0);
    expect(response.body.manufacturingData.machineUsed).toBe('MACHINE-01');
  });

  it('creates a formulation and writes an audit record', async () => {
    const response = await request(createApp())
      .post('/formulations')
      .set('x-user-id', 'tester')
      .send({
        formulationCode: 'FORM-003-A',
        producedDate: '2026-06-20',
        resinComponents: [
          {
            resinComponent: 'Audit Resin',
            percentComposition: 100,
            materialSupplier: 'Audit Supplier',
            lotNumber: 'LOT-AUDIT-001',
          },
        ],
        manufacturingData: {
          machineUsed: 'MACHINE-03',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.formulationCode).toBe('FORM-003-A');

    const auditResult = await getPool().query(
      `SELECT action, changed_by
       FROM audit_log
       WHERE table_name = 'formulations' AND record_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [response.body.id]
    );

    expect(auditResult.rows[0]?.['action']).toBe('INSERT');
    expect(auditResult.rows[0]?.['changed_by']).toBe('tester');
  });

  it('updates a formulation and writes an audit record', async () => {
    const response = await request(createApp())
      .put(`/formulations/${EXISTING_FORMULATION_ID}`)
      .set('x-user-id', 'editor')
      .send({
        producedDate: '2026-06-15',
        manufacturingData: {
          machineUsed: 'MACHINE-99',
          cycleTime: 48,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.producedDate).toBe('2026-06-15');
    expect(response.body.manufacturingData.machineUsed).toBe('MACHINE-99');
    expect(response.body.manufacturingData.cycleTime).toBe(48);

    const auditResult = await getPool().query(
      `SELECT action, changed_by
       FROM audit_log
       WHERE table_name = 'formulations' AND record_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [EXISTING_FORMULATION_ID]
    );

    expect(auditResult.rows[0]?.['action']).toBe('UPDATE');
    expect(auditResult.rows[0]?.['changed_by']).toBe('editor');
  });

  it('rejects invalid create payloads', async () => {
    const response = await request(createApp())
      .post('/formulations')
      .send({
        formulationCode: '',
        resinComponents: [],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('formulationCode is required');
  });

  it('rejects empty updates', async () => {
    const response = await request(createApp()).put(`/formulations/${EXISTING_FORMULATION_ID}`).send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('At least one field must be provided');
  });
});
