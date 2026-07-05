/**
 * verify-db.ts
 *
 * Standalone script to verify PostgreSQL connectivity and ensure the AMFPI database exists.
 * Creates the database if it does not yet exist.
 *
 * Run via:
 *   npm run db:verify:dev
 */

// env.ts must be the first import — it loads process.env from the env file
import { config, initializeConfig } from '../config/env';
import { Client } from 'pg';
import { createPgClientConfig } from '../infrastructure/database/pg-config';

async function verifyDatabase(): Promise<void> {
  await initializeConfig();
  console.log('\n[verify-db] ─────────────────────────────────────');
  console.log('[verify-db] PostgreSQL verification starting...');
  console.log(`[verify-db]   Host     : ${config.db.host}:${config.db.port}`);
  console.log(`[verify-db]   Target DB: ${config.db.name}`);
  console.log(`[verify-db]   User     : ${config.db.user}`);
  console.log('[verify-db] ─────────────────────────────────────');

  if (config.db.authMode === 'entra') {
    const client = new Client(createPgClientConfig({ database: config.db.name, connectionTimeoutMillis: 5_000 }));

    try {
      await client.connect();
      await client.query('SELECT 1');
      console.log(`[verify-db] ✓ Connection to "${config.db.name}" verified`);
      console.log('[verify-db] ✓ Entra-backed database verification PASSED\n');
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[verify-db] ✗ Failed to connect to "${config.db.name}": ${msg}\n`);
      process.exit(1);
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  const adminClient = new Client(
    createPgClientConfig({
      database: 'postgres',
      connectionTimeoutMillis: 5_000,
    })
  );

  try {
    await adminClient.connect();
    console.log('[verify-db] ✓ Connected to PostgreSQL server');

    const result = await adminClient.query<{ exists: number }>(
      'SELECT 1 AS exists FROM pg_database WHERE datname = $1',
      [config.db.name]
    );

    if ((result.rowCount ?? 0) === 0) {
      console.log(`[verify-db]   Database "${config.db.name}" not found — creating...`);
      await adminClient.query(`CREATE DATABASE "${config.db.name}"`);
      console.log(`[verify-db] ✓ Database "${config.db.name}" created`);
    } else {
      console.log(`[verify-db] ✓ Database "${config.db.name}" already exists`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[verify-db] ✗ Admin connection failed: ${msg}`);
    await adminClient.end().catch(() => undefined);
    process.exit(1);
  }

  await adminClient.end();

  const appClient = new Client(createPgClientConfig({ database: config.db.name, connectionTimeoutMillis: 5_000 }));

  try {
    await appClient.connect();
    await appClient.query('SELECT 1');
    console.log(`[verify-db] ✓ Connection to "${config.db.name}" verified`);
    console.log('[verify-db] ✓ Database verification PASSED\n');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[verify-db] ✗ Failed to connect to "${config.db.name}": ${msg}\n`);
    await appClient.end().catch(() => undefined);
    process.exit(1);
  }

  await appClient.end();
}

verifyDatabase().catch((err: unknown) => {
  console.error('[verify-db] Unexpected error:', err);
  process.exit(1);
});
