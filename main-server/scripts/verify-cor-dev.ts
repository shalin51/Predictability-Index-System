import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config, initializeConfig } from '../src/config/env';
import { createDatabaseClient } from '../src/database/migration-runner';

async function verify(): Promise<void> {
  await initializeConfig();
  assert.equal(config.appEnv, 'dev', 'COR verification requires development');
  assert.ok(['localhost', '127.0.0.1'].includes(config.db.host), 'COR verification requires a local database');
  const client = createDatabaseClient();
  await client.connect();
  try {
    await client.query('BEGIN');
    const installed = await client.query("SELECT 1 FROM _migrations WHERE filename = '048_derived_cor_results.sql'");
    if (!installed.rowCount) {
      await client.query(readFileSync(resolve(__dirname, '../src/database/migrations/048_derived_cor_results.sql'), 'utf8'));
    }
    for (const [height, unit] of [[32, 'in'], [812.8, 'mm'], [81.28, 'cm']] as const) {
      const result = await client.query('SELECT cor_from_rebound_height($1, $2)::float AS cor', [height, unit]);
      assert.ok(Math.abs(result.rows[0].cor - Math.sqrt(32 / 78)) < 1e-10);
    }
    for (const [height, unit] of [[-1, 'in'], [800, 'in'], [32, 'unknown'], [null, 'in']] as const) {
      const result = await client.query('SELECT cor_from_rebound_height($1, $2) AS cor', [height, unit]);
      assert.equal(result.rows[0].cor, null);
    }
    const source = await client.query(`SELECT r.id FROM sample_test_results r
      JOIN metric_definitions md ON md.id = r.metric_id WHERE md.metric_key = 'drop_test' LIMIT 1`);
    assert.ok(source.rows[0], 'A development drop result is required for the transaction test');
    const id = source.rows[0].id;
    const derived = () => client.query('SELECT id, value_numeric::float AS cor FROM sample_test_results WHERE derived_from_result_id = $1', [id]);
    await client.query("UPDATE sample_test_results SET value_numeric = 32, unit = 'in' WHERE id = $1", [id]);
    const initial = await derived();
    assert.equal(initial.rowCount, 1);
    assert.equal(initial.rows[0].cor, 0.64051);
    await client.query("UPDATE sample_test_results SET value_numeric = 812.8, unit = 'mm' WHERE id = $1", [id]);
    assert.deepEqual((await derived()).rows, initial.rows, 'Unit conversion must preserve COR and result identity');
    await client.query("UPDATE sample_test_results SET value_numeric = 78, unit = 'in' WHERE id = $1", [id]);
    assert.equal((await derived()).rows[0].cor, 1);
    await client.query('UPDATE sample_test_results SET value_numeric = -1 WHERE id = $1', [id]);
    assert.equal((await derived()).rowCount, 0, 'Invalid source must remove outdated COR');
    await client.query('UPDATE sample_test_results SET value_numeric = 32 WHERE id = $1', [id]);
    assert.equal((await derived()).rowCount, 1);
    await client.query('DELETE FROM sample_test_results WHERE id = $1', [id]);
    assert.equal((await derived()).rowCount, 0, 'Deleting a source must remove its COR');
    console.log('COR verification passed: formula, units, invalid data, updates, and deletion. All test changes rolled back.');
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
}

verify().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
