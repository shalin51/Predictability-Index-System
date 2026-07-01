import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { applyMigrations, applySeeds, createDatabaseClient, resetDatabase } from '../../../database/migration-runner';
import { closePool, getPool } from '../../../infrastructure/database/pg-pool';

const FRANKLIN_BENCHMARK_ID = 'a0000001-0000-0000-0000-000000000002';

describe('ball testing import API contracts', () => {
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

  it('imports formulation and benchmark workbook sheets with raw samples', async () => {
    const response = await request(createApp())
      .post('/imports/ball-testing')
      .set('x-user-id', 'lab-importer')
      .send({
        workbookName: 'Ball Testing.xlsx',
        sheets: [
          {
            sheetName: 'Client Blend 01',
            classification: 'formulation',
            formulationCode: 'CLIENT-BLEND-01',
            formulationName: 'Client Blend 01',
            samples: [
              {
                sampleLabel: 'Sample 1',
                weightG: 25.2,
                compressionLbf: 41.0,
                stretchQuarterInchLbf: 190,
                fullStretchMaxLbf: 228,
                hardnessShoreD: 55.1,
                wallThicknessMm: 1.95,
                diameterMm: 73.9,
              },
              {
                sampleLabel: 'Sample 2',
                weightG: 25.3,
                compressionLbf: 40.4,
                stretchQuarterInchLbf: 194,
                fullStretchMaxLbf: 231,
                hardnessShoreD: 55.4,
                wallThicknessMm: 1.96,
                diameterMm: 73.8,
              },
              {
                sampleLabel: 'Sample 3',
                weightG: 25.1,
                compressionLbf: 40.8,
                stretchQuarterInchLbf: 188,
                fullStretchMaxLbf: 229,
                hardnessShoreD: 55.0,
                wallThicknessMm: 1.94,
                diameterMm: 73.85,
              },
            ],
          },
          {
            sheetName: 'X40',
            classification: 'benchmark',
            benchmarkId: FRANKLIN_BENCHMARK_ID,
            benchmarkName: 'Franklin X-40',
            ballBrand: 'Franklin Sports',
            ballModel: 'X-40',
            syncBenchmarkMetrics: true,
            samples: [
              {
                sampleLabel: 'Sample 1',
                weightG: 26.2,
                compressionLbf: 32.4,
                stretchQuarterInchLbf: 175,
                fullStretchMaxLbf: 205,
                hardnessShoreD: 55,
                wallThicknessMm: 2.2,
                diameterMm: 73.6,
              },
              {
                sampleLabel: 'Sample 2',
                weightG: 25.9,
                compressionLbf: 34.6,
                stretchQuarterInchLbf: 175.6,
                fullStretchMaxLbf: 210,
                hardnessShoreD: 54.5,
                wallThicknessMm: 1.9,
                diameterMm: 73.9,
              },
              {
                sampleLabel: 'Sample 3',
                weightG: 25.9,
                compressionLbf: 31.9,
                stretchQuarterInchLbf: 180,
                fullStretchMaxLbf: 210,
                hardnessShoreD: 54,
                wallThicknessMm: 2.2,
                diameterMm: 74.0,
              },
            ],
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.totals.processedSheets).toBe(2);
    expect(response.body.totals.rawSamplesStored).toBe(6);
    expect(response.body.totals.benchmarkMetricsUpdated).toBeGreaterThanOrEqual(6);

    const formulation = await getPool().query(
      `SELECT id
       FROM formulations
       WHERE formulation_code = 'CLIENT-BLEND-01'`
    );
    expect(formulation.rows[0]?.['id']).toBeTypeOf('string');

    const importedTestResult = await getPool().query(
      `SELECT compression_kg, stretch_quarter_inch_lbf, full_stretch_max_lbf
       FROM test_results
       WHERE formulation_id = $1
       ORDER BY tested_at DESC
       LIMIT 1`,
      [formulation.rows[0]['id']]
    );
    expect(Number(importedTestResult.rows[0]?.['compression_kg'])).toBeGreaterThan(18);
    expect(Number(importedTestResult.rows[0]?.['stretch_quarter_inch_lbf'])).toBeGreaterThan(180);
    expect(Number(importedTestResult.rows[0]?.['full_stretch_max_lbf'])).toBeGreaterThan(220);

    const importSamples = await getPool().query('SELECT COUNT(*) AS count FROM ball_testing_import_samples');
    expect(Number(importSamples.rows[0]?.['count'])).toBe(6);

    const benchmarkMetric = await getPool().query(
      `SELECT target_value
       FROM benchmark_metric_targets
       WHERE benchmark_id = $1 AND metric_name = 'stretch_quarter_inch'`,
      [FRANKLIN_BENCHMARK_ID]
    );
    expect(Number(benchmarkMetric.rows[0]?.['target_value'])).toBeGreaterThan(170);
  });
});
