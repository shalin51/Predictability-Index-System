import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/env';

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');
const SEEDS_DIR = path.resolve(__dirname, 'seeds');

function getSqlFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

export function createDatabaseClient(): Client {
  return new Client({
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    connectionTimeoutMillis: 10_000,
  });
}

export async function resetDatabase(client: Client): Promise<void> {
  await client.query('DROP VIEW IF EXISTS ml_training_export CASCADE');
  await client.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
  await client.query(`
    DROP TABLE IF EXISTS
      request_logs,
      users,
      api_versions,
      audit_log,
      subjective_ratings,
      environmental_results,
      durability_results,
      test_results,
      processing_runs,
      formulation_materials,
      benchmark_metric_targets,
      benchmark_profiles,
      formulations,
      materials,
      suppliers,
      _migrations
    CASCADE
  `);
}

export async function ensureMigrationTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function applyMigrations(client: Client): Promise<void> {
  await ensureMigrationTable(client);

  for (const file of getSqlFiles(MIGRATIONS_DIR)) {
    const applied = await client.query(
      'SELECT 1 FROM _migrations WHERE filename = $1',
      [file]
    );

    if ((applied.rowCount ?? 0) > 0) {
      console.log(`[migrate]   skip ${file} (already applied)`);
      continue;
    }

    console.log(`[migrate]   apply ${file}`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await client.query(sql);
    await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    console.log(`[migrate]   ✓ ${file}`);
  }
}

export async function applySeeds(client: Client): Promise<void> {
  for (const file of getSqlFiles(SEEDS_DIR)) {
    console.log(`[migrate]   seed ${file}`);
    const sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');
    await client.query(sql);
    console.log(`[migrate]   ✓ ${file}`);
  }
}
